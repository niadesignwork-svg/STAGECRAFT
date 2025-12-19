
export enum MusicGenre {
  POP = '流行 (Pop)',
  ROCK = '搖滾/金屬 (Rock/Metal)',
  EDM = '電音 (EDM/Techno)',
  HIPHOP = '嘻哈 (Hip Hop)',
  CLASSICAL = '古典/管弦 (Classical)',
  KPOP = 'K-Pop',
  INDIE = '獨立/另類 (Indie)'
}

export enum VenueSize {
  CLUB = '小型俱樂部 (Club)',
  THEATER = '劇院/音樂廳 (Theater)',
  ARENA = '室內體育館 (Arena)',
  STADIUM = '大型體育場 (Stadium)',
  FESTIVAL = '戶外音樂節 (Festival)'
}

export enum StageForm {
  SYMMETRICAL = '對稱形式 (Symmetrical)',
  ASYMMETRICAL = '不對稱形式 (Asymmetrical)',
  CENTER_360 = '四面台 (Center Stage/In-the-round)',
  THRUST = '伸展台 (Thrust Stage)',
  END_STAGE = '端面台 (End Stage)'
}

export enum StageVibe {
  MINIMALIST = '極簡時尚 (Minimalist)',
  FUTURISTIC = '未來賽博 (Cyberpunk)',
  ORGANIC = '自然有機 (Organic)',
  INDUSTRIAL = '工業廢墟 (Industrial)',
  THEATRICAL = '戲劇張力 (Theatrical)',
  PSYCHEDELIC = '迷幻多彩 (Psychedelic)'
}

export enum StageMechanics {
  STATIC = '靜態無變形 (Static)',
  HYDRAULIC_LIFT = '中央升降舞台 (Hydraulic Lifts)',
  TELESCOPIC_WINGS = '伸縮側翼 (Telescopic Wings)',
  KINETIC_CEILING = '動態天花板 (Kinetic Ceiling)',
  ROTATING_TURNTABLE = '旋轉轉盤 (Turntable)',
  ORIGAMI_FOLD = '折紙式螢幕 (Origami Fold)',
  FLYING_PODS = '懸浮裝置 (Flying Pods)'
}

export enum StageViewpoint {
  FRONT_CENTER = '正面中央 (Front Center)',
  SIDE_LEFT_1F = '1樓左側 (Side Left 1F)',
  SIDE_RIGHT_1F = '1樓右側 (Side Right 1F)',
  ELEVATED_LEFT_3F = '3樓左側俯視 (Elevated Left 3F)',
  ELEVATED_RIGHT_3F = '3樓右側俯視 (Elevated Right 3F)',
  BIRDS_EYE = '全景鳥瞰 (Bird\'s Eye)',
  STAGE_POV = '舞台視角 (Stage POV)',
  CLOSE_UP = '機械細節特寫 (Close Up)',
  PANORAMA_360 = '360度全景 (360 Panorama)'
}

export enum AspectRatio {
  RATIO_16_9 = '16:9 (橫向寬螢幕 Landscape)',
  RATIO_9_16 = '9:16 (直向手機版 Portrait)',
  RATIO_1_1 = '1:1 (正方形 Square)',
  RATIO_4_3 = '4:3 (標準螢幕 Standard)',
  RATIO_3_4 = '3:4 (直向標準 Vertical)',
  RATIO_CUSTOM = '自訂比例 (Custom)'
}

export interface StageConfig {
  genre: MusicGenre;
  venue: VenueSize;
  stageForm: StageForm;
  vibe: StageVibe;
  mechanics: StageMechanics;
  viewpoint: StageViewpoint;
  aspectRatio: AspectRatio;
  customWidth?: number;
  customHeight?: number;
  colors: string;
  elements: string;
  imageCount: number; // 1 to 4
  referenceImage?: string; // Base64 string of uploaded reference
  cinematicLighting?: boolean; // Volumetric fog and dynamic lighting
}

export interface GeneratedDesign {
  id: string;
  imageUrl: string; // The main selected/upscaled image
  videoUrl?: string; // The generated Veo video animation
  variants?: string[]; // The batch generated candidates
  imageHistory: string[]; // History of image URLs
  historyIndex: number;   // Current position in history
  conceptTitle: string;
  description: string;
  transformationSequence: string;
  technicalSpecs: {
    lighting: string;
    video: string;
    specialEffects: string;
  };
  timestamp: number;
  folder?: string; // The name of the folder this design belongs to
}

export interface DesignResponseSchema {
  conceptTitle: string;
  description: string;
  transformationSequence: string;
  technicalSpecs: {
    lighting: string;
    video: string;
    specialEffects: string;
  };
}

export interface CreativeConcept {
  title: string;
  elements: string;
  colors: string;
  vibe: StageVibe;
  mechanics: StageMechanics;
}

export interface SavedConcept extends CreativeConcept {
  id: string;
  timestamp: number;
}
