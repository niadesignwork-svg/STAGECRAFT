
import { GoogleGenAI, Type, Schema, Modality, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { StageConfig, GeneratedDesign, DesignResponseSchema, StageViewpoint, CreativeConcept, StageVibe, StageMechanics, AspectRatio, StageForm } from "../types";

// Helper for safety settings to avoid blocking creative stage designs
const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
];

const extractBase64 = (dataUrl: string): string => {
  const parts = dataUrl.split(',');
  return parts.length > 1 ? parts[1] : dataUrl;
};

const getMimeType = (dataUrl: string): string => {
  const match = dataUrl.match(/^data:(image\/[\w+.-]+);base64,/);
  return match ? match[1] : 'image/png';
};

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Retry an async operation with exponential backoff if it hits a quota limit (429).
 */
async function retryWithBackoff<T>(operation: () => Promise<T>, retries = 3, initialDelay = 2000): Promise<T> {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      const errorMsg = error.message?.toLowerCase() || "";
      const isQuotaError = errorMsg.includes('429') || 
                           errorMsg.includes('quota') || 
                           errorMsg.includes('too many requests') ||
                           error.status === 429;
      
      if (isQuotaError && i < retries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        console.warn(`API Rate limit hit. Retrying in ${delay}ms... (Attempt ${i + 1}/${retries})`);
        await wait(delay);
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

export const generateStageImage = async (config: StageConfig): Promise<string[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    let supportedConfigRatio: string | undefined = '16:9';
    let customDimensionsPrompt = '';

    if (config.aspectRatio === AspectRatio.RATIO_CUSTOM && config.customWidth && config.customHeight) {
      const targetRatioString = `${config.customWidth}:${config.customHeight}`;
      customDimensionsPrompt = `OUTPUT RESOLUTION: ${config.customWidth}x${config.customHeight} pixels. ASPECT RATIO: ${targetRatioString}.`;
      const ratioValue = config.customWidth / config.customHeight;
      const supportedRatios = [
        { key: "1:1", val: 1.0 }, { key: "3:4", val: 0.75 }, { key: "4:3", val: 1.33 },
        { key: "9:16", val: 0.5625 }, { key: "16:9", val: 1.777 }
      ];
      const closest = supportedRatios.reduce((prev, curr) => 
        (Math.abs(curr.val - ratioValue) < Math.abs(prev.val - ratioValue) ? curr : prev));
      supportedConfigRatio = closest.key;
    } else {
      supportedConfigRatio = config.aspectRatio ? config.aspectRatio.split(' ')[0] : '16:9';
    }

    const atmosphericPrompt = config.cinematicLighting 
      ? "Atmosphere: Extreme volumetric fog, cinematic god rays, dynamic lighting, high contrast shadows, lens flares."
      : "Atmosphere: Standard clean concert lighting rig.";

    const isPanorama = config.viewpoint === StageViewpoint.PANORAMA_360;
    const viewPrompt = isPanorama
      ? "View: Equirectangular projection 360-degree panorama."
      : `View Perspective: ${config.viewpoint}.`;

    let formPrompt = "";
    switch (config.stageForm) {
      case StageForm.SYMMETRICAL:
        formPrompt = "Stage Layout: Strictly Symmetrical. Perfectly balanced left and right mirroring.";
        break;
      case StageForm.ASYMMETRICAL:
        formPrompt = "Stage Layout: Intentional Asymmetry. Unbalanced, avant-garde design. One side has higher or different structures than the other.";
        break;
      case StageForm.CENTER_360:
        formPrompt = "Stage Layout: Four-sided stage (Center Stage). Audience surrounds the stage on all 4 sides. The stage is in the middle. No backstage wall.";
        break;
      case StageForm.THRUST:
        formPrompt = "Stage Layout: Thrust Stage. Main stage with a long catwalk extension protruding deep into the audience. Audience on 3 sides of the extension.";
        break;
      case StageForm.END_STAGE:
        formPrompt = "Stage Layout: End Stage. Stage positioned at one end of the venue, audience all in front.";
        break;
      default:
        formPrompt = `Stage Layout: ${config.stageForm}`;
    }

    const corePrompt = `
      Professional concert production render. 
      Stage Design: ${config.genre} style.
      Venue: ${config.venue}.
      ${formPrompt}
      Kinetic Movement: ${config.mechanics}. 
      Key Elements: ${config.elements}.
      Theme: ${config.vibe}. Color Palette: ${config.colors}.
      ${viewPrompt} ${atmosphericPrompt} ${customDimensionsPrompt}
      Style: High-end architectural rendering, Unreal Engine 5, 8k, extremely detailed set design, professional photography.
    `;

    const parts: any[] = [];
    if (config.referenceImage) {
      parts.push({
        inlineData: {
          data: extractBase64(config.referenceImage),
          mimeType: getMimeType(config.referenceImage),
        },
      });
      parts.push({ text: `Analyze the input image's shape, architectural language, and materials, then apply it to this specific concert stage design: ${corePrompt}` });
    } else {
      parts.push({ text: corePrompt });
    }

    const images: string[] = [];
    for (let i = 0; i < config.imageCount; i++) {
      if (i > 0) await wait(1000);
      try {
        const response = await retryWithBackoff(async () => {
          return await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts },
            config: {
              responseModalities: [Modality.IMAGE],
              safetySettings,
              // @ts-ignore
              imageConfig: { aspectRatio: supportedConfigRatio }
            },
          });
        });

        const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (part?.inlineData) images.push(`data:image/png;base64,${part.inlineData.data}`);
      } catch (err) {
        console.error(`Attempt ${i+1} failed:`, err);
        break;
      }
    }
    
    if (images.length > 0) return images;
    throw new Error("Failed to generate stage images.");
  } catch (error) {
    console.error("Error generating image:", error);
    throw error;
  }
};

export const upscaleStageImage = async (imageUrl: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const prompt = "Upscale this stage design. Enhance mechanical details, sharpen textures, improve volumetric lighting fidelity, and output in 8k production quality. Ensure it looks realistic.";
    const response = await retryWithBackoff(async () => {
      return await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { inlineData: { data: extractBase64(imageUrl), mimeType: getMimeType(imageUrl) } },
            { text: prompt }
          ],
        },
        config: { responseModalities: [Modality.IMAGE], safetySettings },
      });
    });
    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (part?.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    throw new Error("Upscale failed.");
  } catch (error) {
    console.error("Upscale error:", error);
    throw error;
  }
}

export const generateViewpointVariant = async (originalImageUrl: string, targetViewpoint: StageViewpoint): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const prompt = `Keep this exact stage design but change the camera viewpoint to: ${targetViewpoint}. Maintain all architectural elements and lighting.`;
    const response = await retryWithBackoff(async () => {
      return await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { inlineData: { data: extractBase64(originalImageUrl), mimeType: getMimeType(originalImageUrl) } },
            { text: prompt }
          ],
        },
        config: { responseModalities: [Modality.IMAGE], safetySettings },
      });
    });
    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (part?.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    throw new Error("Viewpoint variant failed.");
  } catch (error) {
    console.error("Viewpoint error:", error);
    throw error;
  }
};

export const generateSimilarVariant = async (originalImageUrl: string, count: number = 1): Promise<string[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = "Generate a creative variation of this stage design. Keep the theme, colors, and genre, but slightly modify the arrangement and kinetic layout.";
  const images: string[] = [];
  for (let i = 0; i < count; i++) {
    if (i > 0) await wait(1000);
    try {
      const response = await retryWithBackoff(async () => {
        return await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
            parts: [
              { inlineData: { data: extractBase64(originalImageUrl), mimeType: getMimeType(originalImageUrl) } },
              { text: prompt }
            ],
          },
          config: { responseModalities: [Modality.IMAGE], safetySettings },
        });
      });
      const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
      if (part?.inlineData) images.push(`data:image/png;base64,${part.inlineData.data}`);
    } catch (err) { break; }
  }
  return images;
};

export const editStageImage = async (currentImageUrl: string, instruction: string, maskBase64?: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const parts: any[] = [{ inlineData: { data: extractBase64(currentImageUrl), mimeType: getMimeType(currentImageUrl) } }];
    let finalPrompt = instruction;
    if (maskBase64) {
      parts.push({ inlineData: { data: extractBase64(maskBase64), mimeType: 'image/png' } });
      finalPrompt = `Edit ONLY the area indicated by white pixels in the mask. Instruction: ${instruction}. Keep the rest of the stage identical.`;
    }
    parts.push({ text: finalPrompt });

    const response = await retryWithBackoff(async () => {
      return await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts },
        config: { responseModalities: [Modality.IMAGE], safetySettings },
      });
    });
    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (part?.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    throw new Error("Edit failed.");
  } catch (error) {
    throw error;
  }
};

export const generateStageDescription = async (config: StageConfig): Promise<Omit<GeneratedDesign, 'id' | 'imageUrl' | 'videoUrl' | 'timestamp' | 'imageHistory' | 'historyIndex'>> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const responseSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        conceptTitle: { type: Type.STRING },
        description: { type: Type.STRING },
        transformationSequence: { type: Type.STRING },
        technicalSpecs: {
          type: Type.OBJECT,
          properties: {
            lighting: { type: Type.STRING },
            video: { type: Type.STRING },
            specialEffects: { type: Type.STRING }
          },
          required: ["lighting", "video", "specialEffects"]
        }
      },
      required: ["conceptTitle", "description", "transformationSequence", "technicalSpecs"]
    };

    const prompt = `Act as a professional concert stage architect. Create a design specification for a ${config.genre} performance.
      Venue: ${config.venue}. Layout: ${config.stageForm}. Automation: ${config.mechanics}. Vibe: ${config.vibe}. Elements: ${config.elements}.
      Output strictly in Traditional Chinese (繁體中文).`;

    const response = await retryWithBackoff(async () => {
      return await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: "application/json", responseSchema }
      });
    });

    return JSON.parse(response.text) as DesignResponseSchema;
  } catch (error) {
    console.error("Text generation error:", error);
    return {
      conceptTitle: "設計概念",
      description: "無法生成描述。",
      transformationSequence: "無變動細節。",
      technicalSpecs: { lighting: "N/A", video: "N/A", specialEffects: "N/A" }
    };
  }
};

export const generateCreativeConcepts = async (): Promise<CreativeConcept[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const schema: Schema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          elements: { type: Type.STRING },
          colors: { type: Type.STRING },
          vibe: { type: Type.STRING, enum: Object.values(StageVibe) },
          mechanics: { type: Type.STRING, enum: Object.values(StageMechanics) }
        },
        required: ["title", "elements", "colors", "vibe", "mechanics"]
      }
    };
    const response = await retryWithBackoff(async () => {
      return await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: "Generate 3 highly creative and unique concert stage design concepts. Return as JSON in Traditional Chinese.",
        config: { responseMimeType: "application/json", responseSchema: schema }
      });
    });
    return JSON.parse(response.text) as CreativeConcept[];
  } catch (error) { return []; }
};

export const generateStageVideo = async (imageUrl: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const prompt = "Cinematic slow camera pan across the concert stage, moving spotlights, atmospheric stage fog, photorealistic 4k quality.";
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt,
      image: { imageBytes: extractBase64(imageUrl), mimeType: getMimeType(imageUrl) },
      config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
    });

    while (!operation.done) {
      await wait(5000);
      operation = await ai.operations.getVideosOperation({ operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) throw new Error("Video generation failed.");
    const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    const blob = await videoResponse.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    throw error;
  }
};
