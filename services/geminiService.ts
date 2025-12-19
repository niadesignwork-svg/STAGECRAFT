
import { GoogleGenAI, Type, Schema, Modality, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { StageConfig, GeneratedDesign, DesignResponseSchema, StageViewpoint, CreativeConcept, StageVibe, StageMechanics, AspectRatio, StageForm } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// Helper for safety settings to avoid blocking creative stage designs
const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
];

/**
 * Helper to strip the Data URL prefix and get raw base64 string.
 * Uses split to be safe against varying regex patterns.
 */
const extractBase64 = (dataUrl: string): string => {
  const parts = dataUrl.split(',');
  return parts.length > 1 ? parts[1] : dataUrl;
};

/**
 * Helper to extract MIME type from a data URL.
 * Defaults to image/png if not found.
 */
const getMimeType = (dataUrl: string): string => {
  const match = dataUrl.match(/^data:(image\/[\w+.-]+);base64,/);
  return match ? match[1] : 'image/png';
};

/**
 * Wait for a specified duration (ms)
 */
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Retry an async operation with exponential backoff if it hits a quota limit.
 */
async function retryWithBackoff<T>(operation: () => Promise<T>, retries = 3, initialDelay = 2000): Promise<T> {
  let lastError: any;
  
  for (let i = 0; i < retries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      const isQuotaError = error.message?.includes('429') || 
                           error.message?.toLowerCase().includes('quota') || 
                           error.status === 429;
      
      if (isQuotaError && i < retries - 1) {
        const delay = initialDelay * Math.pow(2, i); // 2s, 4s, 8s
        console.warn(`Quota hit. Retrying in ${delay}ms... (Attempt ${i + 1}/${retries})`);
        await wait(delay);
        continue;
      }
      
      // If it's not a quota error, or we ran out of retries, throw immediately
      throw error;
    }
  }
  throw lastError;
}

export const generateStageImage = async (config: StageConfig): Promise<string[]> => {
  try {
    // Determine Ratio
    let supportedConfigRatio: string | undefined = '16:9';
    let customDimensionsPrompt = '';

    if (config.aspectRatio === AspectRatio.RATIO_CUSTOM && config.customWidth && config.customHeight) {
      // 1. Construct the exact prompt instruction for the custom size
      const targetRatioString = `${config.customWidth}:${config.customHeight}`;
      customDimensionsPrompt = `OUTPUT RESOLUTION: ${config.customWidth}x${config.customHeight} pixels. ASPECT RATIO: ${targetRatioString}.`;

      // 2. Calculate the decimal ratio to find the closest supported API config
      const ratioValue = config.customWidth / config.customHeight;
      const supportedRatios = [
        { key: "1:1", val: 1.0 },
        { key: "3:4", val: 0.75 },
        { key: "4:3", val: 1.33 },
        { key: "9:16", val: 0.5625 },
        { key: "16:9", val: 1.777 }
      ];
      
      const closest = supportedRatios.reduce((prev, curr) => {
        return (Math.abs(curr.val - ratioValue) < Math.abs(prev.val - ratioValue) ? curr : prev);
      });
      supportedConfigRatio = closest.key;
      
    } else {
      supportedConfigRatio = config.aspectRatio ? config.aspectRatio.split(' ')[0] : '16:9';
    }

    // Inject atmospheric prompts if enabled
    const atmosphericPrompt = config.cinematicLighting 
      ? "Intense volumetric fog, heavy god rays, dynamic beams of light, high contrast shadows, cinematic bloom, haze, particle effects."
      : "Standard concert lighting.";

    // 360 Panorama specific instructions
    const isPanorama = config.viewpoint === StageViewpoint.PANORAMA_360;
    const viewPrompt = isPanorama
      ? "Equirectangular projection, 360-degree seamless VR panorama texture, full spherical view."
      : `VIEWPOINT/PERSPECTIVE: ${config.viewpoint}. Ensure the rendering angle strictly matches this perspective.`;

    // Stage Form Specific Logic
    let formPrompt = "";
    switch (config.stageForm) {
      case StageForm.SYMMETRICAL:
        formPrompt = "STAGE LAYOUT: Perfectly Symmetrical. Mirror image design on left and right.";
        break;
      case StageForm.ASYMMETRICAL:
        formPrompt = "STAGE LAYOUT: ASYMMETRICAL. Unbalanced, avant-garde composition. Do NOT make it symmetrical. One side should be taller or have different elements than the other.";
        break;
      case StageForm.CENTER_360:
        formPrompt = "STAGE LAYOUT: CENTER STAGE / IN-THE-ROUND. The stage is in the middle of the arena. Audience visible on ALL 4 SIDES. No backdrop wall. 360-degree performance area.";
        break;
      case StageForm.THRUST:
        formPrompt = "STAGE LAYOUT: THRUST STAGE. A long catwalk or main stage section extending deep into the audience. Audience on 3 sides of the thrust.";
        break;
      case StageForm.END_STAGE:
        formPrompt = "STAGE LAYOUT: END STAGE. Traditional concert setup with stage at one end and audience facing it.";
        break;
      default:
        formPrompt = `STAGE LAYOUT: ${config.stageForm}`;
    }

    // Common prompt elements
    const corePrompt = `
      A professional, high-resolution photorealistic render of a TRANSFORMABLE concert stage design in action.
      
      ${viewPrompt}
      ${customDimensionsPrompt}
      ${formPrompt}

      CORE MECHANICS (Primary Focus): ${config.mechanics}.
      The image should depict the stage MID-TRANSFORMATION showing mechanical parts, pistons, hydraulics, or moving panels clearly. 
      Make it look engineered and functional.

      Genre Style: ${config.genre}.
      Venue Type: ${config.venue}.
      Atmosphere/Vibe: ${config.vibe}.
      Key Elements: ${config.elements}.
      Color Palette: ${config.colors}.
      
      Lighting & Atmosphere: ${atmosphericPrompt}
      Render details: Unreal Engine 5 style, 8k resolution, highly detailed textures, architectural visualization, kinetic architecture.
      NO TEXT overlay, NO watermarks.
    `;

    // Prepare inputs for Gemini 2.5 Flash Image
    const parts: any[] = [];

    // If Reference Image Exists
    if (config.referenceImage) {
      const mimeType = getMimeType(config.referenceImage);
      const base64Data = extractBase64(config.referenceImage);
      
      parts.push({
        inlineData: {
          data: base64Data,
          mimeType: mimeType,
        },
      });

      const multimodalPrompt = `
        ${corePrompt}
        
        IMPORTANT INSTRUCTION ON REFERENCE IMAGE:
        The provided input image is a VISUAL REFERENCE for the style, shape, or specific object to be integrated into the stage design.
        Analyze the aesthetic, geometry, and material of the reference image and incorporate it heavily into the concert stage design.
        However, ensure it still functions as a concert stage with the requested mechanics (${config.mechanics}), layout (${formPrompt}) and perspective (${config.viewpoint}).
        
        Output Aspect Ratio should be approximately ${supportedConfigRatio}.
      `;
      parts.push({ text: multimodalPrompt });
    } else {
      // Text Only
      parts.push({ text: corePrompt });
    }

    // SEQUENTIAL GENERATION: Execute requests one by one to avoid Rate Limits (Quota Exceeded)
    const images: string[] = [];

    for (let i = 0; i < config.imageCount; i++) {
        try {
            // Add a delay between requests (if not the first one) to be polite to the rate limiter
            if (i > 0) {
                await wait(1000);
            }

            // Wrap in Retry Logic
            const response = await retryWithBackoff(async () => {
                return await ai.models.generateContent({
                    model: 'gemini-2.5-flash-image',
                    contents: {
                        parts: parts,
                    },
                    config: {
                        responseModalities: [Modality.IMAGE],
                        safetySettings: safetySettings,
                        // @ts-ignore
                        imageConfig: {
                            aspectRatio: supportedConfigRatio
                        }
                    },
                });
            });

            // Extract candidate
            const candidates = response.candidates;
            if (candidates && candidates.length > 0) {
                if (candidates[0].finishReason && candidates[0].finishReason !== 'STOP') {
                    console.warn(`Attempt ${i+1}: Image generation blocked or finished abnormally:`, candidates[0].finishReason);
                }

                for (const part of candidates[0].content?.parts || []) {
                    if (part.inlineData) {
                        images.push(`data:image/png;base64,${part.inlineData.data}`);
                    }
                }
            }
        } catch (error: any) {
            console.warn(`Batch generation attempt ${i+1} failed after retries:`, error);
            // If we hit a quota limit even after retries, stop the loop early but return what we have so far
            if (error.message?.includes('429') || error.message?.toLowerCase().includes('quota')) {
                console.warn("Quota limit hit persistently. Stopping remaining batch requests.");
                break;
            }
        }
    }
    
    if (images.length > 0) return images;
    throw new Error("No image generated (All attempts failed or Quota exceeded)");

  } catch (error) {
    console.error("Error generating image:", error);
    throw error;
  }
};

/**
 * Upscales the selected image by generating a higher fidelity version using image-to-image.
 */
export const upscaleStageImage = async (imageUrl: string): Promise<string> => {
  try {
    const base64Data = extractBase64(imageUrl);
    const mimeType = getMimeType(imageUrl);

    const prompt = `
      CRITICAL TASK: RE-RENDER this draft image into a FINAL PRODUCTION QUALITY 8K MASTERPIECE.
      
      1. SHARPNESS: Eliminate all blur. The output must be razor-sharp.
      2. TEXTURE: Add intricate micro-details to the LED screens, metal trusses, floor surfaces, and mechanical parts.
      3. LIGHTING: Refine the volumetric fog and light beams to be physically accurate (Ray Tracing style).
      4. COMPOSITION: Keep the EXACT structure and colors of the original, but upgrade the fidelity significantly.
      
      Style: Unreal Engine 5 Cinematic Render, Octane Render, Ultra-High Definition.
    `;

    const response = await retryWithBackoff(async () => {
      return await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType,
              },
            },
            { text: prompt }
          ],
        },
        config: {
          responseModalities: [Modality.IMAGE],
          safetySettings: safetySettings,
        },
      });
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    
    throw new Error("No upscaled image returned");
  } catch (error) {
    console.error("Error upscaling image:", error);
    throw error;
  }
}

/**
 * Generates a new image of the same stage design but from a different viewpoint.
 */
export const generateViewpointVariant = async (
  originalImageUrl: string,
  targetViewpoint: StageViewpoint
): Promise<string> => {
  try {
    const base64Data = extractBase64(originalImageUrl);
    const mimeType = getMimeType(originalImageUrl);

    const prompt = `
      The first image provided is a concept for a concert stage.
      Task: Re-render this EXACT SAME stage design from a new perspective: "${targetViewpoint}".
      
      Maintain the same architectural structure, mechanical elements, color palette, and lighting style.
      Only change the camera angle.
      
      If the request is "Bird's Eye", show the layout from above.
      If "Side View", show the profile.
      If "Front Center", show the symmetric view.
      ${targetViewpoint === StageViewpoint.PANORAMA_360 ? 'If "360 Panorama", output an equirectangular projection.' : ''}
      
      High quality, photorealistic, Unreal Engine 5 render.
    `;

    const response = await retryWithBackoff(async () => {
      return await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType,
              },
            },
            { text: prompt }
          ],
        },
        config: {
          responseModalities: [Modality.IMAGE],
          safetySettings: safetySettings,
        },
      });
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    
    throw new Error("No variant image returned");
  } catch (error) {
    console.error("Error generating viewpoint variant:", error);
    throw error;
  }
};

/**
 * Generates similar variations of the provided stage image.
 */
export const generateSimilarVariant = async (originalImageUrl: string, count: number = 1): Promise<string[]> => {
  try {
    const base64Data = extractBase64(originalImageUrl);
    const mimeType = getMimeType(originalImageUrl);

    const prompt = `
      The image provided is a concert stage design.
      Task: Generate a CREATIVE VARIATION of this design.
      
      Maintain the same Genre, Vibe, and Color Palette.
      However, alter the layout, structural shapes, and mechanical configuration to create a fresh alternative.
      If the original is circular, try a hexagonal approach. If it's flat, add verticality.
      
      Make it a high-quality, photorealistic render suitable for a design proposal.
    `;

    // SEQUENTIAL GENERATION for reliability
    const images: string[] = [];

    for (let i = 0; i < count; i++) {
        try {
            // Delay to prevent rate limiting
            if (i > 0) await wait(1000);

            const response = await retryWithBackoff(async () => {
                return await ai.models.generateContent({
                    model: 'gemini-2.5-flash-image',
                    contents: {
                    parts: [
                        {
                        inlineData: {
                            data: base64Data,
                            mimeType: mimeType,
                        },
                        },
                        { text: prompt }
                    ],
                    },
                    config: {
                    responseModalities: [Modality.IMAGE],
                    safetySettings: safetySettings,
                    },
                });
            });

            for (const part of response.candidates?.[0]?.content?.parts || []) {
                if (part.inlineData) {
                    images.push(`data:image/png;base64,${part.inlineData.data}`);
                }
            }
        } catch (error: any) {
            console.warn(`Similar variant attempt ${i+1} failed after retries:`, error);
            if (error.message?.includes('429') || error.message?.toLowerCase().includes('quota')) {
                 console.warn("Quota limit hit persistently. Stopping remaining variant requests.");
                 break;
            }
        }
    }

    if (images.length > 0) return images;
    
    throw new Error("No similar variant returned (All attempts failed or Quota exceeded)");
  } catch (error) {
    console.error("Error generating similar variant:", error);
    throw error;
  }
};

/**
 * Edits a stage image based on a text instruction and an optional mask.
 */
export const editStageImage = async (
  currentImageUrl: string, 
  instruction: string, 
  maskBase64?: string
): Promise<string> => {
  try {
    const base64Data = extractBase64(currentImageUrl);
    const mimeType = getMimeType(currentImageUrl);

    const parts: any[] = [
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType,
        },
      }
    ];

    let finalPrompt = instruction;

    if (maskBase64) {
      const maskData = extractBase64(maskBase64);
      // Mask is usually PNG from canvas
      parts.push({
        inlineData: {
          data: maskData,
          mimeType: 'image/png', 
        }
      });
      
      finalPrompt = `
        The first image is the input stage design. 
        The second image is a MASK where white pixels represent the area to edit. 
        Operation: Modify ONLY the area defined by the white pixels in the mask image according to this instruction: "${instruction}".
        Keep the rest of the image (black areas of the mask) EXACTLY as it is. 
        Blend the changes naturally into the scene.
      `;
    }

    parts.push({ text: finalPrompt });

    const response = await retryWithBackoff(async () => {
      return await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: parts,
        },
        config: {
          responseModalities: [Modality.IMAGE],
          safetySettings: safetySettings,
        },
      });
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    
    throw new Error("No image returned from edit operation");
  } catch (error) {
    console.error("Error editing image:", error);
    throw error;
  }
};

export const generateStageDescription = async (config: StageConfig): Promise<Omit<GeneratedDesign, 'id' | 'imageUrl' | 'videoUrl' | 'timestamp' | 'imageHistory' | 'historyIndex'>> => {
  try {
    const responseSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        conceptTitle: { type: Type.STRING, description: "A catchy, creative name for this stage design concept." },
        description: { type: Type.STRING, description: "A detailed creative description of the stage layout and aesthetic." },
        transformationSequence: { type: Type.STRING, description: "A detailed description of how the stage moves, transforms, or changes shape during the concert." },
        technicalSpecs: {
          type: Type.OBJECT,
          properties: {
            lighting: { type: Type.STRING, description: "Description of lighting rig fixtures and placement." },
            video: { type: Type.STRING, description: "Description of LED screens and visual content surfaces." },
            specialEffects: { type: Type.STRING, description: "Description of pyrotechnics, cryo, lasers, or automation." }
          },
          required: ["lighting", "video", "specialEffects"]
        }
      },
      required: ["conceptTitle", "description", "transformationSequence", "technicalSpecs"]
    };

    const referenceContext = config.referenceImage 
      ? " The user has provided a visual reference image (style/shape) which is being used for the visual generation. Ensure the text description reflects the likely style of that reference mixed with the genre." 
      : "";

    const prompt = `
      Act as a world-class concert production designer specializing in kinetic architecture and automation. 
      Create a conceptual design specification for a transformable concert stage based on these parameters:
      
      - Music Genre: ${config.genre}
      - Venue Size: ${config.venue}
      - Stage Layout/Form: ${config.stageForm}
      - Vibe: ${config.vibe}
      - Kinetic Mechanics: ${config.mechanics}
      - Viewpoint: ${config.viewpoint}
      - Color Scheme: ${config.colors}
      - Special Requests: ${config.elements}
      ${referenceContext}

      Provide a creative title, a vivid description, and CRITICALLY: describe the 'transformationSequence'. 
      Explain exactly how the stage changes shape.
      
      IMPORTANT: Output the 'conceptTitle', 'description', 'transformationSequence' and 'technicalSpecs' in Traditional Chinese (繁體中文).
      Keep the tone professional, artistic, and impactful.
    `;

    const response = await retryWithBackoff(async () => {
      return await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: responseSchema,
        }
      });
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No text generated");

    return JSON.parse(jsonText) as DesignResponseSchema;

  } catch (error) {
    console.error("Error generating description:", error);
    return {
      conceptTitle: "生成錯誤",
      description: "無法生成詳細資訊，請重試。",
      transformationSequence: "因錯誤而顯示靜態配置。",
      technicalSpecs: {
        lighting: "N/A",
        video: "N/A",
        specialEffects: "N/A"
      }
    };
  }
};

export const generateCreativeConcepts = async (): Promise<CreativeConcept[]> => {
  try {
    const schema: Schema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "A creative, short title for the concept in Traditional Chinese." },
          elements: { type: Type.STRING, description: "Specific props, shapes, or materials in Traditional Chinese." },
          colors: { type: Type.STRING, description: "A unique color palette description in Traditional Chinese." },
          vibe: { 
            type: Type.STRING, 
            enum: Object.values(StageVibe),
            description: "The best matching StageVibe enum value." 
          },
          mechanics: { 
            type: Type.STRING, 
            enum: Object.values(StageMechanics),
            description: "The best matching StageMechanics enum value." 
          }
        },
        required: ["title", "elements", "colors", "vibe", "mechanics"]
      }
    };

    const seeds = [
      "Bio-luminescence", "Clockwork Steampunk", "Gothic Cathedral", "Broken Glass", "Floating Islands",
      "Neon Tokyo", "Ancient Ruins", "Digital Glitch", "Liquid Metal", "Origami Paper",
      "Underwater Coral", "Volcanic Magma", "Crystal Cave", "Zero Gravity", "Vaporwave Grid",
      "Art Deco", "Brutalist Concrete", "Holographic Void", "Cybernetic Forest", "Solarpunk"
    ];
    
    const shuffled = seeds.sort(() => 0.5 - Math.random());
    const selectedSeeds = shuffled.slice(0, 3);

    const prompt = `
      Generate 3 distinct, highly creative, and visually striking concert stage design concepts.
      To ensure variety, base each concept loosely on one of these unique themes: ${selectedSeeds.join(', ')}.
      
      Mix different themes (e.g., Sci-Fi, Nature, Gothic, Industrial).
      Return the result in Traditional Chinese (except for Enum values which must match the provided list).
    `;

    // Only retry this if necessary, but usually text is fine. Added for consistency.
    const response = await retryWithBackoff(async () => {
      return await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: schema,
          temperature: 1.2,
        }
      });
    });

    const jsonText = response.text;
    if (!jsonText) return [];
    return JSON.parse(jsonText) as CreativeConcept[];

  } catch (error) {
    console.error("Error generating ideas:", error);
    return [];
  }
};

/**
 * Generates a short video animation using Veo.
 */
export const generateStageVideo = async (imageUrl: string): Promise<string> => {
  try {
    const aiVeo = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const base64Data = extractBase64(imageUrl);
    const mimeType = getMimeType(imageUrl);

    const prompt = "Cinematic camera subtle pan, concert lights beams moving dynamically, atmospheric fog flowing, stage mechanical parts slightly moving, photorealistic 4k.";

    let operation = await aiVeo.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      image: {
        imageBytes: base64Data,
        mimeType: mimeType, 
      },
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '16:9' 
      }
    });

    // We don't retry video generation in the same way because long polling manages the state, 
    // but the initial request *could* be rate limited. 
    // Usually Veo has stricter limits so retry might not help if quota is hard exhausted. 
    // Keeping simple for now to avoid complexity in polling logic.

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      operation = await aiVeo.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) throw new Error("No video URI returned");

    const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    if (!videoResponse.ok) throw new Error("Failed to download video bytes");

    const blob = await videoResponse.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  } catch (error) {
    console.error("Error generating video:", error);
    throw error;
  }
};
