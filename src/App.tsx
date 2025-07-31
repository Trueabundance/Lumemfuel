import React, { useState, useEffect, useCallback, createContext, useContext, FC, ReactNode } from 'react';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, Auth, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, query, doc, deleteDoc, Firestore, getDocs, setDoc, getDoc, writeBatch } from 'firebase/firestore';
import { Droplet, BarChart3, Info, X, Plus, Star, Lock, Trash2, TrendingUp, Globe, Sparkles, AlertTriangle, Zap, Settings, Edit, Save, Award, Share2, BellRing, CheckCircle, XCircle, History } from 'lucide-react';
// @ts-ignore
import confetti from 'canvas-confetti';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// --- Type Definitions for TypeScript ---
interface SugaryDrink {
    id?: string;
    type: string;
    volume: number;
    sugarGrams: number;
    timestamp: string;
    isCustom?: boolean; // Flag for custom quick adds
}

interface CustomQuickAddSugar {
    id?: string;
    type: string;
    volume: number;
    sugar: number; // sugar per 100ml
    label: string;
}

interface BodyImpactAnalysis {
    name: string;
    impact: number;
    effectText: string;
    impactColor: string;
    impactWord: string;
}

interface Analysis {
    [key: string]: BodyImpactAnalysis;
}

interface Translations {
    [key: string]: {
        [key: string]: string | ((...args: any[]) => string);
    };
}

interface WeeklyChartData {
    name: string;
    sugar: number;
}

interface Achievement {
    id: string;
    nameKey: string;
    descriptionKey: string;
    earnedDate: string;
}

interface DailyChallenge {
    id: string;
    textKey: string;
    completed: boolean;
    type: 'log_n_drinks' | 'stay_below_goal' | 'use_custom_quick_add';
    value?: number;
}

// --- Firebase & App Configuration ---
// Use environment variables provided by the platform.
declare const __firebase_config: string;
declare const __initial_auth_token: string;
declare const __app_id: string;

const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const appId = typeof __app_id !== 'undefined' ? __app_id : 'lumenfuel-app-standalone';

// --- Gemini API Key ---
// NOTE: Using the key provided by the user. For production, this should be handled via a secure backend.
const GEMINI_API_KEY = "AIzaSyCh7YqkGuLqlWfZr2OzfqJrl6dilDO4YVM";

// --- Global Drink Presets for LumenFuel ---
const globalSugaryDrinkPresets: { [region: string]: { [key: string]: { volume: number; sugar: number; translationKey: string; } } } = {
    'uk': {
        soda: { volume: 330, sugar: 10.6, translationKey: "quick_add_soda_can" },
        juice: { volume: 200, sugar: 10, translationKey: "quick_add_juice_carton" },
        energy_drink: { volume: 250, sugar: 11, translationKey: "quick_add_energy_drink_can" },
        sweet_tea: { volume: 500, sugar: 8, translationKey: "quick_add_sweet_tea_bottle" },
        sports_drink: { volume: 500, sugar: 6, translationKey: "quick_add_sports_drink_bottle" },
    },
    'us': {
        soda: { volume: 355, sugar: 10.6, translationKey: "quick_add_soda_can_us" },
        juice: { volume: 236, sugar: 10, translationKey: "quick_add_juice_box_us" },
        energy_drink: { volume: 240, sugar: 11, translationKey: "quick_add_energy_drink_can_us" },
        sweet_tea: { volume: 473, sugar: 8, translationKey: "quick_add_sweet_tea_bottle_us" },
        sports_drink: { volume: 591, sugar: 6, translationKey: "quick_add_sports_drink_bottle_us" },
    },
};

// --- I18N (Internationalization) Setup ---
const translations: Translations = {
    en: {
        app_title: "LumenFuel",
        header_premium_button: "Go Premium",
        header_premium_status: "Premium",
        section_title_impact: "Real-Time Body Impact",
        section_subtitle_impact: "Educational model of sugar's short-term effects.",
        label_total_sugar: "Total Sugar Today",
        section_title_control: "Fuel Intake",
        button_log_drink: "Log a Drink",
        disclaimer_title: "Disclaimer",
        disclaimer_text: "LumenFuel is an educational tool, not medical advice. Consult a professional for health guidance.",
        section_title_log: "Today's Drink Log",
        log_empty: "No drinks logged yet today.",
        section_title_premium: "Premium Features",
        modal_title: "Log a Sugary Drink",
        modal_drink_type: "Drink Type",
        modal_volume: "Volume (ml)",
        modal_sugar: "Sugar (g / 100ml)",
        modal_add_button: "Add to Log",
        drink_soda: "Soda",
        drink_juice: "Fruit Juice",
        drink_energy_drink: "Energy Drink",
        drink_sweet_tea: "Sweet Tea / Iced Coffee",
        drink_sports_drink: "Sports Drink",
        impact_low: "Low",
        impact_moderate: "Moderate",
        impact_high: "High",
        impact_pancreas_low: "Normal insulin response expected.",
        impact_pancreas_moderate: "Increased demand on pancreas for insulin production.",
        impact_pancreas_high: "High insulin spike, straining metabolic function.",
        impact_energy_low: "Stable energy levels.",
        impact_energy_moderate: "Quick energy spike, potential for a later crash.",
        impact_energy_high: "Intense energy rush, likely followed by a significant crash.",
        impact_liver_low: "Standard liver processing.",
        impact_liver_moderate: "Liver working harder to process fructose.",
        impact_liver_high: "Significant fructose load, contributing to fat storage.",
        ai_coach_title: "AI Coach Insight",
        ai_coach_generating: "Generating insight...",
        ai_coach_no_key: "AI Coach is disabled. A Gemini API key is required for this feature.",
        premium_dashboard_title: "Premium Dashboard",
        historical_trends_title: "Your Weekly Sugar Trends",
        long_term_insights_title: "Long-Term AI Insights",
        chart_loading: "Loading historical data...",
        chart_no_data: "Not enough data to display trends. Keep logging your drinks!",
        premium_modal_title: "Unlock Premium!",
        premium_modal_text: "Access historical trends, advanced AI insights, and more by going Premium!",
        premium_modal_button: "Unlock Now",
        premium_feature_trends_title: "Historical Trends",
        premium_feature_trends_desc: "Visualize your sugar intake over time with interactive charts.",
        premium_feature_insights_title: "Long-Term AI Insights",
        premium_feature_insights_desc: "Get personalized advice based on your long-term consumption patterns.",
        quick_log_title: "Quick Add",
        quick_add_soda_can: "Soda Can (330ml)",
        quick_add_juice_carton: "Juice Carton (200ml)",
        quick_add_energy_drink_can: "Energy Drink (250ml)",
        quick_add_sweet_tea_bottle: "Sweet Tea (500ml)",
        quick_add_sports_drink_bottle: "Sports Drink (500ml)",
        quick_add_soda_can_us: "Soda Can (12oz)",
        quick_add_juice_box_us: "Juice Box (8oz)",
        quick_add_energy_drink_can_us: "Energy Drink (8oz)",
        quick_add_sweet_tea_bottle_us: "Sweet Tea (16oz)",
        quick_add_sports_drink_bottle_us: "Sports Drink (20oz)",
        region_selector_title: "Region",
        region_uk: "United Kingdom",
        region_us: "United States",
        region_au: "Australia",
        region_de: "Germany",
        region_pancreas: "Pancreas",
        region_liver: "Liver",
        region_energy: "Energy Levels",
        manage_quick_adds: "Manage Quick Adds",
        add_custom_quick_add: "Add Custom Quick Add",
        edit_custom_quick_add: "Edit Custom Quick Add",
        custom_quick_add_label: "Button Label",
        custom_quick_add_type: "Drink Type",
        custom_quick_add_volume: "Volume (ml)",
        custom_quick_add_sugar: "Sugar (g/100ml)",
        save_quick_add: "Save Quick Add",
        delete_quick_add: "Delete",
        no_custom_quick_adds: "No custom quick adds yet.",
        daily_goal_title: "Daily Sugar Goal",
        set_goal: "Set Goal (grams)",
        current_progress: "Current Progress",
        goal_set_success: "Daily goal set!",
        goal_delete_success: "Daily goal removed.",
        goal_not_set: "No daily goal set.",
        goal_exceeded: "Goal Exceeded!",
        goal_remaining: "remaining",
        achievements_title: "Achievements",
        achievement_first_log_name: "First Taste",
        achievement_first_log_desc: "Logged your first sugary drink!",
        achievement_consistent_logger_7_name: "Consistent Logger",
        achievement_consistent_logger_7_desc: "Logged drinks on 7 different days!",
        achievement_consistent_logger_30_name: "Dedicated Logger",
        achievement_consistent_logger_30_desc: "Logged drinks on 30 different days!",
        achievement_goal_hitter_5_name: "Goal Setter Novice",
        achievement_goal_hitter_5_desc: "Met your daily sugar goal 5 times!",
        achievement_10_drinks_name: "Sweet Tooth Starter",
        achievement_10_drinks_desc: "Logged 10 sugary drinks!",
        achievement_50_drinks_name: "Sugar Tracker",
        achievement_50_drinks_desc: "Logged 50 sugary drinks!",
        achievement_100_drinks_name: "Sugar Master",
        achievement_100_drinks_desc: "Logged 100 sugary drinks!",
        no_achievements_yet: "No achievements earned yet. Keep logging!",
        share_progress_button: "Share Progress",
        share_message_goal: "Today I consumed {grams}g of sugar, staying within my goal of {goal}g with LumenFuel! #HealthyChoices #LumenFuel",
        share_message_over_goal: "Today I consumed {grams}g of sugar, exceeding my goal of {goal}g. Time to reflect with LumenFuel! #HealthJourney #LumenFuel",
        share_message_no_goal: "Today I consumed {grams}g of sugar. Track your intake with LumenFuel! #HealthApp",
        daily_challenge_title: "Daily Challenge",
        daily_challenge_completed: "Completed!",
        daily_challenge_log_n_drinks: "Log at least {value} drink(s) today.",
        daily_challenge_stay_below_goal: "Stay below {value}g sugar today.",
        daily_challenge_use_custom_quick_add: "Use a custom quick add button.",
        daily_challenge_no_challenge: "No challenge for today. Enjoy your tracking!",
        log_late_drink: "Log Past Drink",
        reminder_title: "Time to check in?",
        reminder_text: "It's been a while. Remember to log your drinks to stay on track!",
        reminder_log_button: "Log Drink",
        reminder_dismiss_button: "Dismiss",
        share_error: "Could not share progress. You can copy the text instead.",
        premium_error: "Failed to start payment process. Please try again.",
    },
    de: { // German
        app_title: "LumenKraftstoff",
        header_premium_button: "Premium werden",
        section_title_impact: "Echtzeit-Körperauswirkung",
        section_subtitle_impact: "Bildungsmodell der kurzfristigen Auswirkungen von Zucker.",
        label_total_sugar: "Gesamtzucker Heute",
        section_title_control: "Kraftstoffaufnahme",
        button_log_drink: "Getränk protokollieren",
        disclaimer_title: "Haftungsausschluss",
        disclaimer_text: "LumenKraftstoff ist ein Bildungstool, keine medizinische Beratung. Konsultieren Sie einen Fachmann für Gesundheitsberatung.",
        section_title_log: "Heutiges Getränkeprotokoll",
        log_empty: "Heute noch keine Getränke protokolliert.",
        modal_title: "Zuckerhaltiges Getränk protokollieren",
        modal_drink_type: "Getränketyp",
        modal_volume: "Volumen (ml)",
        modal_sugar: "Zucker (g / 100ml)",
        modal_add_button: "Zum Protokoll hinzufügen",
        drink_soda: "Limonade",
        drink_juice: "Fruchtsaft",
        drink_energy_drink: "Energy-Drink",
        drink_sweet_tea: "Süßer Tee / Eiskaffee",
        drink_sports_drink: "Sportgetränk",
        impact_low: "Niedrig",
        impact_moderate: "Mittel",
        impact_high: "Hoch",
        impact_pancreas_low: "Normale Insulinreaktion erwartet.",
        impact_pancreas_moderate: "Erhöhter Bedarf an Insulinproduktion der Bauchspeicheldrüse.",
        impact_pancreas_high: "Hoher Insulinspiegel, belastet die Stoffwechselfunktion.",
        impact_energy_low: "Stabile Energieniveaus.",
        impact_energy_moderate: "Schneller Energieschub, Potenzial für einen späteren Absturz.",
        impact_energy_high: "Intensiver Energieschub, wahrscheinlich gefolgt von einem deutlichem Absturz.",
        impact_liver_low: "Standard-Leberverarbeitung.",
        impact_liver_moderate: "Leber arbeitet härter, um Fruktose zu verarbeiten.",
        impact_liver_high: "Erhebliche Fruktoselast, trägt zur Fettspeicherung bei.",
        ai_coach_title: "KI-Coach-Einblick",
        ai_coach_generating: "Einblick generieren...",
        quick_log_title: "Schnell hinzufügen",
        quick_add_soda_can: "Limonadendose (330ml)",
        quick_add_juice_carton: "Saftkarton (200ml)",
        region_uk: "Vereinigtes Königreich",
        region_us: "Vereinigte Staaten",
        region_de: "Deutschland",
        region_pancreas: "Bauchspeicheldrüse",
        region_liver: "Leber",
        region_energy: "Energielevel",
        log_late_drink: "Vergangenes Getränk protokollieren",
    },
    es: { // Spanish
        app_title: "LumenFuel",
        header_premium_button: "Hazte Premium",
        section_title_impact: "Impacto Corporal en Tiempo Real",
        section_subtitle_impact: "Modelo educativo de los efectos del azúcar a corto plazo.",
        label_total_sugar: "Azúcar Total Hoy",
        section_title_control: "Consumo de Combustible",
        button_log_drink: "Registrar Bebida",
        disclaimer_title: "Aviso Legal",
        disclaimer_text: "LumenFuel es una herramienta educativa, no un consejo médico. Consulte a un profesional para obtener orientación sobre la salud.",
        section_title_log: "Registro de Bebidas de Hoy",
        log_empty: "No hay bebidas registradas hoy.",
        modal_title: "Registrar Bebida Azucarada",
        modal_drink_type: "Tipo de Bebida",
        modal_volume: "Volumen (ml)",
        modal_sugar: "Azúcar (g / 100ml)",
        modal_add_button: "Añadir al Registro",
        drink_soda: "Refresco",
        drink_juice: "Zumo de Fruta",
        drink_energy_drink: "Bebida Energética",
        drink_sweet_tea: "Té Dulce / Café Helado",
        drink_sports_drink: "Bebida Deportiva",
        impact_low: "Bajo",
        impact_moderate: "Moderado",
        impact_high: "Alto",
        impact_pancreas_low: "Respuesta normal de insulina esperada.",
        impact_pancreas_moderate: "Mayor demanda de producción de insulina en el páncreas.",
        impact_pancreas_high: "Pico alto de insulina, forzando la función metabólica.",
        impact_energy_low: "Niveles de energía estables.",
        impact_energy_moderate: "Pico rápido de energía, con posible caída posterior.",
        impact_energy_high: "Subida de energía intensa, probablemente seguida de una caída significativa.",
        impact_liver_low: "Procesamiento hepático estándar.",
        impact_liver_moderate: "El hígado trabaja más para procesar la fructosa.",
        impact_liver_high: "Carga significativa de fructosa, contribuyendo al almacenamiento de grasa.",
        ai_coach_title: "Análisis del Coach IA",
        ai_coach_generating: "Generando análisis...",
        quick_log_title: "Añadir Rápido",
        quick_add_soda_can: "Lata de Refresco (330ml)",
        quick_add_juice_carton: "Cartón de Zumo (200ml)",
        region_uk: "Reino Unido",
        region_us: "Estados Unidos",
        region_de: "Alemania",
        region_pancreas: "Páncreas",
        region_liver: "Hígado",
        region_energy: "Niveles de Energía",
        log_late_drink: "Registrar Bebida Pasada",
    },
    ja: { // Japanese
        app_title: "ルーメンフューエル",
        header_premium_button: "プレミアムに移行",
        section_title_impact: "リアルタイムの身体への影響",
        section_subtitle_impact: "砂糖の短期的な影響の教育モデル。",
        label_total_sugar: "今日の総砂糖量",
        section_title_control: "燃料摂取量",
        button_log_drink: "飲酒を記録",
        disclaimer_title: "免責事項",
        disclaimer_text: "ルーメンフューエルは教育ツールであり、医療アドバイスではありません。健康に関するガイダンスについては専門家にご相談ください。",
        section_title_log: "今日の飲酒ログ",
        log_empty: "今日はまだ飲酒が記録されていません。",
        modal_title: "甘い飲み物を記録",
        modal_drink_type: "飲み物の種類",
        modal_volume: "容量 (ml)",
        modal_sugar: "砂糖 (g / 100ml)",
        modal_add_button: "ログに追加",
        drink_soda: "ソーダ",
        drink_juice: "フルーツジュース",
        drink_energy_drink: "エナジードリンク",
        drink_sweet_tea: "甘いお茶 / アイスコーヒー",
        drink_sports_drink: "スポーツドリンク",
        impact_low: "低い",
        impact_moderate: "中程度",
        impact_high: "高い",
        impact_pancreas_low: "正常なインスリン応答が期待されます。",
        impact_pancreas_moderate: "インスリン産生に対する膵臓の需要が増加。",
        impact_pancreas_high: "高インスリンスパイク、代謝機能に負担。",
        impact_energy_low: "安定したエネルギーレベル。",
        impact_energy_moderate: "急激なエネルギー上昇、その後のクラッシュの可能性。",
        impact_energy_high: "激しいエネルギーラッシュ、その後に大きなクラッシュが続く可能性が高い。",
        impact_liver_low: "標準的な肝臓処理。",
        impact_liver_moderate: "肝臓はフルクトースを処理するためにより活発に働きます。",
        impact_liver_high: "かなりのフルクトース負荷、脂肪蓄積に寄与。",
        ai_coach_title: "AIコーチのインサイト",
        ai_coach_generating: "インサイトを生成中...",
        quick_log_title: "クイック追加",
        quick_add_soda_can: "ソーダ缶 (330ml)",
        quick_add_juice_carton: "ジュースカートン (200ml)",
        region_uk: "イギリス",
        region_us: "アメリカ合衆国",
        region_de: "ドイツ",
        region_pancreas: "膵臓",
        region_liver: "肝臓",
        region_energy: "エネルギーレベル",
        log_late_drink: "過去の飲酒を記録",
    },
    ko: { // Korean
        app_title: "루멘퓨얼",
        header_premium_button: "프리미엄으로 전환",
        section_title_impact: "실시간 신체 영향",
        section_subtitle_impact: "설탕의 단기적 영향에 대한 교육 모델입니다.",
        label_total_sugar: "오늘의 총 설탕",
        section_title_control: "연료 섭취",
        button_log_drink: "음료 기록",
        disclaimer_title: "면책 조항",
        disclaimer_text: "루멘퓨얼은 교육 도구이며 의학적 조언이 아닙니다. 건강 관련 조언은 전문가와 상담하십시오。",
        section_title_log: "오늘의 음료 기록",
        log_empty: "오늘은 아직 기록된 음료가 없습니다.",
        modal_title: "설탕 음료 기록",
        modal_drink_type: "음료 종류",
        modal_volume: "용량 (ml)",
        modal_sugar: "설탕 (g / 100ml)",
        modal_add_button: "기록에 추가",
        drink_soda: "탄산음료",
        drink_juice: "과일 주스",
        drink_energy_drink: "에너지 드링크",
        drink_sweet_tea: "달콤한 차 / 아이스 커피",
        drink_sports_drink: "스포츠 드링크",
        impact_low: "낮음",
        impact_moderate: "보통",
        impact_high: "높음",
        impact_pancreas_low: "정상적인 인슐린 반응이 예상됩니다.",
        impact_pancreas_moderate: "인슐린 생산에 대한 췌장의 수요 증가.",
        impact_pancreas_high: "높은 인슐린 스파이크, 대사 기능에 부담.",
        impact_energy_low: "안정적인 에너지 수준.",
        impact_energy_moderate: "급격한 에너지 스파이크, 이후 급격한 피로 가능성.",
        impact_energy_high: "강렬한 에너지 러시, 이후 상당한 피로가 따를 가능성이 높습니다.",
        impact_liver_low: "표준 간 처리.",
        impact_liver_moderate: "간이 과당을 처리하기 위해 더 열심히 작동합니다.",
        impact_liver_high: "상당한 과당 부하, 지방 저장에 기여.",
        ai_coach_title: "AI 코치 통찰력",
        ai_coach_generating: "통찰력 생성 중...",
        quick_log_title: "빠른 추가",
        quick_add_soda_can: "탄산음료 캔 (330ml)",
        quick_add_juice_carton: "주스 카톤 (200ml)",
        region_uk: "영국",
        region_us: "미국",
        region_de: "독일",
        region_pancreas: "췌장",
        region_liver: "간",
        region_energy: "에너지 레벨",
        log_late_drink: "지난 음료 기록",
    },
};


const LanguageContext = createContext<{ language: string; setLanguage: (lang: string) => void; t: (key: string, ...args: any[]) => string; } | undefined>(undefined);

const LanguageProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const [language, setLanguage] = useState('en');
    const t = useCallback((key: string, ...args: any[]): string => {
        const langObj = translations[language] || translations['en'];
        const translation = langObj[key] || translations['en'][key];
        if (typeof translation === 'function') {
            return translation(...args);
        }
        return (translation as string) || key;
    }, [language]);

    return <LanguageContext.Provider value={{ language, setLanguage, t }}>{children}</LanguageContext.Provider>;
};

const useTranslation = () => {
    const context = useContext(LanguageContext);
    if (context === undefined) throw new Error('useTranslation must be used within a LanguageProvider');
    return context;
};

// --- Body Impact Data & Simulation ---
const bodyRegionsData: { [key: string]: { name: string; sensitivity: number; } } = {
    pancreas: { name: "region_pancreas", sensitivity: 1.5 },
    liver: { name: "region_liver", sensitivity: 1.2 },
    energy: { name: "region_energy", sensitivity: 1.8 },
};

const analyzeSugarConsumption = (drinks: SugaryDrink[], t: (key: string, ...args: any[]) => string): Analysis => {
    const totalSugarGrams = drinks.reduce((acc, drink) => acc + drink.sugarGrams, 0);
    let analysis: Analysis = {};
    let overallImpactLevel = totalSugarGrams > 0 ? Math.min(Math.log1p(totalSugarGrams / 5) * 1.8, 5) : 0;

    Object.keys(bodyRegionsData).forEach(key => {
        const region = bodyRegionsData[key];
        const regionImpact = Math.min(overallImpactLevel * region.sensitivity, 5);
        let effectText: string, impactColor: string, impactWord: string;

        if (regionImpact <= 1.5) {
            impactWord = t('impact_low'); impactColor = 'text-green-400'; effectText = t(`impact_${key}_low`);
        } else if (regionImpact <= 3.5) {
            impactWord = t('impact_moderate'); impactColor = 'text-yellow-400'; effectText = t(`impact_${key}_moderate`);
        } else {
            impactWord = t('impact_high'); impactColor = 'text-red-500'; effectText = t(`impact_${key}_high`);
        }
        analysis[key] = { name: region.name, impact: regionImpact, effectText, impactColor, impactWord };
    });
    return analysis;
};

// --- React Components ---

const Notification: FC<{ message: string; type: 'success' | 'error'; onClose: () => void; }> = ({ message, type, onClose }) => {
    if (!message) return null;
    const bgColor = type === 'success' ? 'bg-green-600' : 'bg-red-600';
    const Icon = type === 'success' ? CheckCircle : XCircle;

    useEffect(() => {
        const timer = setTimeout(onClose, 5000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className={`fixed bottom-5 right-5 ${bgColor} text-white p-4 rounded-lg shadow-lg z-[100] flex items-center gap-4`}>
            <Icon size={24} />
            <span>{message}</span>
            <button onClick={onClose}><X size={20} /></button>
        </div>
    );
};

const AICoach: FC<{ drinks: SugaryDrink[]; analysis: Analysis | null; dailySugarGoal: number | null; }> = ({ drinks, analysis, dailySugarGoal }) => {
    const { t } = useTranslation();
    const [insight, setInsight] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isVisible, setIsVisible] = useState(true);

    const generateInsight = useCallback(async () => {
        if (!GEMINI_API_KEY) { setInsight(t('ai_coach_no_key')); return; }
        if (!drinks || drinks.length < 2 || !analysis) return;

        setIsLoading(true);
        setInsight('');

        const sessionSummary = drinks.map(d => `${d.volume}ml of ${t(`drink_${d.type}`)}`).join(', ');
        const totalSugar = drinks.reduce((sum, d) => sum + d.sugarGrams, 0).toFixed(1);
        
        let goalContext = "";
        if (dailySugarGoal !== null && dailySugarGoal > 0) {
            const currentGrams = parseFloat(totalSugar);
            if (currentGrams > dailySugarGoal) {
                goalContext = `They have exceeded their daily goal of ${dailySugarGoal}g by ${(currentGrams - dailySugarGoal).toFixed(1)}g.`;
            } else {
                goalContext = `They are currently at ${currentGrams}g towards their daily goal of ${dailySugarGoal}g.`;
            }
        }

        const prompt = `As an expert nutritionist for the app LumenFuel, a user has logged: ${sessionSummary}, totaling ${totalSugar}g of sugar. The current analysis shows a high impact on their energy and pancreas. ${goalContext} Provide a single, concise, actionable, and non-judgmental insight (20-30 words). Focus on a specific, helpful suggestion related to their current consumption (e.g., suggesting water, a lower-sugar alternative, or eating protein to balance the spike). Be specific and encouraging. Example: "That's a significant sugar rush. A short walk can help your body use that energy and soften the potential crash later."`;

        try {
            const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
                setInsight(result.candidates[0].content.parts[0].text);
            } else {
                setInsight("Could not generate an insight at this time.");
            }
        } catch (error) {
            console.error("Error generating AI insight:", error);
            setInsight("There was an issue connecting to the AI coach.");
        } finally {
            setIsLoading(false);
        }
    }, [drinks, analysis, t, dailySugarGoal]);

    useEffect(() => {
        if (drinks.length >= 2) {
            generateInsight();
        }
    }, [drinks.length, generateInsight]);

    if (drinks.length < 2 || !isVisible) return null;

    return (
        <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl p-6 border border-blue-400/30 shadow-lg mt-8">
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                    <Sparkles className="text-blue-300" size={24} />
                    <h3 className="text-xl font-bold text-white">{t('ai_coach_title')}</h3>
                </div>
                <button onClick={() => setIsVisible(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="text-blue-100/90 text-sm">
                {isLoading ? (
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-dashed rounded-full animate-spin border-white"></div>
                        <span>{t('ai_coach_generating')}</span>
                    </div>
                ) : (<p>{insight}</p>)}
            </div>
        </div>
    );
};

const BodyVisual: FC<{ analysis: Analysis | null; drinkCount: number }> = ({ analysis, drinkCount }) => {
    const getImpactColor = (impact: number) => {
        if (impact > 3.5) return 'rgba(239, 68, 68, 0.6)'; // Red
        if (impact > 1.5) return 'rgba(250, 204, 21, 0.6)'; // Yellow
        if (impact > 0) return 'rgba(74, 222, 128, 0.5)'; // Green
        return 'rgba(59, 130, 246, 0.2)'; // Calm Blue
    };

    const pancreasFill = analysis ? getImpactColor(analysis.pancreas.impact) : 'rgba(59, 130, 246, 0.2)';
    const liverFill = analysis ? getImpactColor(analysis.liver.impact) : 'rgba(59, 130, 246, 0.2)';
    const pancreasImpact = analysis?.pancreas.impact || 0;
    const liverImpact = analysis?.liver.impact || 0;
    
    return (
        <div className="relative w-full mx-auto aspect-square flex items-center justify-center overflow-hidden">
            <svg viewBox="0 0 200 200" className="w-full h-full absolute inset-0">
                <defs>
                    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(107, 114, 128, 0.1)" strokeWidth="0.5"/>
                    </pattern>
                </defs>
                <rect width="200" height="200" fill="url(#grid)" />
            </svg>

            <svg viewBox="0 0 200 150" className="relative z-10 w-full h-full drop-shadow-lg">
                <defs>
                    <filter id="organGlow">
                        <feGaussianBlur stdDeviation="3.5" result="blur" />
                        <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10" result="glow" />
                        <feComposite in="SourceGraphic" in2="glow" operator="over" />
                    </filter>
                </defs>
                
                <g transform="translate(0, -20)">
                    <g filter={analysis && analysis.liver.impact > 0.5 ? "url(#organGlow)" : "none"}>
                        <path d="M105,30 C140,25 160,50 155,80 C150,110 120,115 100,105 Z" fill={liverFill} className="transition-all duration-500 organ-pulse" style={{'--pulse-duration': `${2 - liverImpact * 0.2}s`} as React.CSSProperties}/>
                        <text x="125" y="75" textAnchor="middle" alignmentBaseline="middle" fill="white" fontSize="20" fontWeight="bold" stroke="black" strokeWidth="1.5px" paintOrder="stroke">{`L`}</text>
                    </g>
                    <g filter={analysis && analysis.pancreas.impact > 0.5 ? "url(#organGlow)" : "none"}>
                        <path d="M45,80 C70,75 100,85 105,100 C110,115 90,125 70,120 C50,115 40,95 45,80 Z" fill={pancreasFill} className="transition-all duration-500 organ-pulse" style={{'--pulse-duration': `${2 - pancreasImpact * 0.2}s`} as React.CSSProperties}/>
                        <text x="75" y="105" textAnchor="middle" alignmentBaseline="middle" fill="white" fontSize="20" fontWeight="bold" stroke="black" strokeWidth="1.5px" paintOrder="stroke">{`P`}</text>
                    </g>
                </g>
            </svg>

            <div className="dose-animation-container" key={drinkCount}>
                {drinkCount > 0 && (
                    <>
                        <Droplet size={36} className="text-yellow-300 dose-droplet" />
                        <div className="dose-splash"></div>
                        <Zap size={48} className="text-yellow-300 dose-zap" />
                    </>
                )}
            </div>
        </div>
    );
};

const DrinkModal: FC<{ isOpen: boolean; onClose: () => void; onLogDrink: (drink: Omit<SugaryDrink, 'id' | 'isCustom'>, isCustom: boolean) => void; initialDrinkData?: { type: string; volume: number; sugar: number; isCustom: boolean }; currentRegion: string; showDateTimePicker?: boolean; }> = ({ isOpen, onClose, onLogDrink, initialDrinkData, currentRegion, showDateTimePicker = false }) => {
    const { t } = useTranslation();
    const [drinkType, setDrinkType] = useState('soda');
    const [volume, setVolume] = useState(355);
    const [sugarPer100ml, setSugarPer100ml] = useState(10.6);
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [selectedTime, setSelectedTime] = useState<string>(new Date().toTimeString().split(' ')[0].substring(0, 5));
    
    const drinkPresets = globalSugaryDrinkPresets[currentRegion] || globalSugaryDrinkPresets['uk'];

    useEffect(() => {
        if (isOpen) {
            if (initialDrinkData) {
                setDrinkType(initialDrinkData.type);
                setVolume(initialDrinkData.volume);
                setSugarPer100ml(initialDrinkData.sugar);
            } else {
                const defaultType = 'soda';
                setDrinkType(defaultType);
                const preset = drinkPresets[defaultType];
                setVolume(preset.volume);
                setSugarPer100ml(preset.sugar);
            }
            if (!initialDrinkData) {
                const now = new Date();
                setSelectedDate(now.toISOString().split('T')[0]);
                setSelectedTime(now.toTimeString().split(' ')[0].substring(0, 5));
            }
        }
    }, [isOpen, initialDrinkData, drinkPresets]);

    const handleDrinkTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newType = e.target.value;
        setDrinkType(newType);
        const preset = drinkPresets[newType] || drinkPresets['soda'];
        setVolume(preset.volume);
        setSugarPer100ml(preset.sugar);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const timestamp = showDateTimePicker ? new Date(`${selectedDate}T${selectedTime}`).toISOString() : new Date().toISOString();
        const totalSugarGrams = (volume * sugarPer100ml) / 100;
        onLogDrink({ type: drinkType, volume: Number(volume), sugarGrams: totalSugarGrams, timestamp }, initialDrinkData?.isCustom || false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-md border border-gray-700">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-white">{t('modal_title')}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={24} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-300 mb-2">{t('modal_drink_type')}</label>
                        <select value={drinkType} onChange={handleDrinkTypeChange} className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none">
                            <option value="soda">{t('drink_soda')}</option>
                            <option value="juice">{t('drink_juice')}</option>
                            <option value="energy_drink">{t('drink_energy_drink')}</option>
                            <option value="sweet_tea">{t('drink_sweet_tea')}</option>
                            <option value="sports_drink">{t('drink_sports_drink')}</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">{t('modal_volume')}</label>
                            <input type="number" value={volume} onChange={(e) => setVolume(Number(e.target.value))} className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">{t('modal_sugar')}</label>
                            <input type="number" value={sugarPer100ml} step="0.1" onChange={(e) => setSugarPer100ml(Number(e.target.value))} className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                        </div>
                    </div>

                    {showDateTimePicker && (
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Date</label>
                                <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" max={new Date().toISOString().split('T')[0]} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Time</label>
                                <input type="time" value={selectedTime} onChange={(e) => setSelectedTime(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                            </div>
                        </div>
                    )}

                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-300 flex items-center justify-center gap-2"><Plus size={20} /> {t('modal_add_button')}</button>
                </form>
            </div>
        </div>
    );
};

const PremiumModal: FC<{ isOpen: boolean; onClose: () => void; onConfirm: () => void; isLoading: boolean; }> = ({ isOpen, onClose, onConfirm, isLoading }) => {
    const { t } = useTranslation();
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-gray-700 text-center">
                <div className="flex justify-end">
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={24} /></button>
                </div>
                <div className="flex justify-center mb-4">
                    <Star className="text-yellow-400" size={40} />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">{t('premium_modal_title')}</h2>
                <p className="text-gray-300 mb-6">{t('premium_modal_text')}</p>
                <button onClick={onConfirm} disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-wait">
                    {isLoading ? "Redirecting..." : t('premium_modal_button')}
                </button>
            </div>
        </div>
    );
};

const LanguageSwitcher: FC = () => {
    const { language, setLanguage } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);

    const languages: { [key: string]: string } = {
        en: "English",
        de: "Deutsch",
        es: "Español",
        ja: "日本語",
        ko: "한국어"
    };

    return (
        <div className="relative">
            <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 text-gray-300 hover:text-white">
                <Globe size={20} />
                <span className="hidden sm:inline">{languages[language]}</span>
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50">
                    {Object.entries(languages).map(([code, name]) => (
                        <button key={code} onClick={() => { setLanguage(code); setIsOpen(false); }}
                            className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700">
                            {name}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

const RegionSwitcherFuel: FC<{ currentRegion: string; setRegion: (region: string) => void }> = ({ currentRegion, setRegion }) => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);

    const regions: { [key: string]: string } = {
        uk: t('region_uk') as string,
        us: t('region_us') as string,
        au: t('region_au') as string,
        de: t('region_de') as string,
    };

    return (
        <div className="relative">
            <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 text-gray-300 hover:text-white">
                <Globe size={20} />
                <span className="hidden sm:inline">{regions[currentRegion]}</span>
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50">
                    {Object.entries(regions).map(([code, name]) => (
                        <button key={code} onClick={() => { setRegion(code); setIsOpen(false); }}
                            className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700">
                            {name}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};


const PremiumFeature: FC<{ title: string; description: string; icon: ReactNode; onUpgrade: () => void; }> = ({ title, description, icon, onUpgrade }) => (
    <div className="relative bg-gray-800 p-4 rounded-lg border border-gray-700 overflow-hidden">
        <div className="flex items-center mb-2">{icon}<h4 className="font-bold ml-2 text-gray-200">{title}</h4></div>
        <p className="text-xs text-gray-400">{description}</p>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center">
            <Lock className="text-yellow-400 mb-2" size={24} />
            <button onClick={onUpgrade} className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 text-xs font-bold py-1 px-3 rounded-full transition-colors">Upgrade to Unlock</button>
        </div>
    </div>
);


const PremiumDashboard: FC<{ db: Firestore | null; userId: string | null; dailySugarGoal: number | null; }> = ({ db, userId, dailySugarGoal }) => {
    const { t } = useTranslation();
    return (
        <div className="lg:col-span-2 space-y-8">
            <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
                <div className="flex items-center mb-4">
                    <BarChart3 className="text-yellow-400" />
                    <h3 className="text-xl font-bold ml-2">{t('historical_trends_title')}</h3>
                </div>
                {/* <HistoricalChart db={db} userId={userId} /> */}
            </div>
            {/* <LongTermAICoach db={db} userId={userId} dailySugarGoal={dailySugarGoal} /> */}
        </div>
    );
};

// --- Main App Component ---
function AppContent() {
    const { t, language } = useTranslation();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
    const [drinks, setDrinks] = useState<SugaryDrink[]>([]);
    const [analysis, setAnalysis] = useState<Analysis | null>(null);
    const [db, setDb] = useState<Firestore | null>(null);
    const [auth, setAuth] = useState<Auth | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [isPremium, setIsPremium] = useState(false);
    const [isConfigMissing, setIsConfigMissing] = useState(false);
    const [showReminder, setShowReminder] = useState(false);
    const [lastLogTime, setLastLogTime] = useState<number>(Date.now());
    const [userRegion, setUserRegion] = useState('uk');
    const [customQuickAdds, setCustomQuickAdds] = useState<CustomQuickAddSugar[]>([]);
    const [isManageQuickAddsModalOpen, setIsManageQuickAddsModalOpen] = useState(false);
    const [dailySugarGoal, setDailySugarGoal] = useState<number | null>(null);
    const [achievements, setAchievements] = useState<Achievement[]>([]);
    const [isAchievementsModalOpen, setIsAchievementsModalOpen] = useState(false);
    const [dailyChallenge, setDailyChallenge] = useState<DailyChallenge | null>(null);
    const [isLoadingPremium, setIsLoadingPremium] = useState(false);
    const [showLateLogModal, setShowLateLogModal] = useState(false);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // --- Firebase Initialization and Auth Handling ---
    useEffect(() => {
        if (!firebaseConfig || Object.keys(firebaseConfig).length === 0 || !firebaseConfig.apiKey) {
            setIsConfigMissing(true);
            return;
        }
        
        try {
            const app = initializeApp(firebaseConfig);
            const firestoreDb = getFirestore(app);
            const firebaseAuth = getAuth(app);
            setDb(firestoreDb);
            setAuth(firebaseAuth);

            const signInUser = async () => {
                try {
                    // Use the custom token if provided by the platform environment
                    if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                        await signInWithCustomToken(firebaseAuth, __initial_auth_token);
                    } else {
                        // Fallback to anonymous sign-in for local development or other environments
                        await signInAnonymously(firebaseAuth);
                    }
                } catch (error) {
                    console.error("Firebase sign-in error:", error);
                }
            };

            // Listener for auth state changes
            const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
                if (user) {
                    setUserId(user.uid);
                } else {
                    // If no user, attempt to sign in.
                    signInUser();
                }
            });

            return () => unsubscribe();
        } catch (e) {
            console.error("Error initializing Firebase:", e);
            setIsConfigMissing(true);
        }
    }, []);
    
    // --- Check for successful payment on component mount ---
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('success') === 'true') {
            setIsPremium(true);
            confetti({
                particleCount: 150,
                spread: 180,
                origin: { y: 0.6 }
            });
            // Clean up the URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, []);


    // --- Data Fetching & Listeners ---
    useEffect(() => {
        if (!db || !userId) return;

        // Drinks listener
        const drinksQuery = query(collection(db, `artifacts/${appId}/users/${userId}/drinks`));
        const unsubscribeDrinks = onSnapshot(drinksQuery, (snapshot) => {
            const drinksData: SugaryDrink[] = [];
            snapshot.forEach((doc) => drinksData.push({ id: doc.id, ...doc.data() } as SugaryDrink));
            drinksData.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            setDrinks(drinksData);
            if (drinksData.length > 0) setLastLogTime(Date.now());
            setShowReminder(false);
        });

        // Other listeners (quick adds, goal, achievements, etc.) would go here...

        return () => {
            unsubscribeDrinks();
            // Unsubscribe other listeners...
        };
    }, [db, userId]);

    // --- Analysis Calculation ---
    useEffect(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todaysDrinks = drinks.filter(d => new Date(d.timestamp) >= today);
        setAnalysis(analyzeSugarConsumption(todaysDrinks, t));
    }, [drinks, t, language]);

    // --- Core Logic ---
    const handleLogDrink = async (drinkData: Omit<SugaryDrink, 'id' | 'isCustom'>, isCustom: boolean) => {
        if (!db || !userId) return;
        const fullDrinkData: Omit<SugaryDrink, 'id'> = { ...drinkData, isCustom };
        try {
            const drinksCollectionPath = `artifacts/${appId}/users/${userId}/drinks`;
            await addDoc(collection(db, drinksCollectionPath), fullDrinkData);
            
            // Trigger achievement and challenge checks
            // checkAchievements(drinks.length + 1, fullDrinkData);
            // checkDailyChallengeCompletion(fullDrinkData);

            if (navigator.vibrate) navigator.vibrate(50);
        } catch (error) {
            console.error("Error adding drink to Firestore: ", error);
        }
    };
    
    const handleGoPremium = async () => {
        if (!userId) {
            setNotification({ message: "Please wait for user to be authenticated.", type: 'error' });
            return;
        }

        setIsLoadingPremium(true);
        try {
            const checkoutApiUrl = 'https://stripe-backend-api-xi-seven.vercel.app/api/create-checkout-session';
            const priceId = 'price_1RoPQ6PEmeNnPDdSW6nyZN5z';
            const redirectUrl = window.location.origin;

            const response = await fetch(checkoutApiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ priceId, userId, redirectUrl }),
            });

            const data = await response.json();

            if (response.ok && data.url) {
                window.location.assign(data.url);
            } else {
                console.error('Error initiating checkout:', data.message || 'Unknown error', data.details);
                setNotification({ message: t('premium_error'), type: 'error' });
                setIsLoadingPremium(false);
            }
        } catch (error) {
            console.error('Network or unexpected error during checkout initiation:', error);
            setNotification({ message: t('premium_error'), type: 'error' });
            setIsLoadingPremium(false);
        }
    };
    
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todaysDrinks = drinks.filter(drink => new Date(drink.timestamp).getTime() >= startOfToday.getTime());
    const totalSugarGramsToday = todaysDrinks.reduce((sum, drink) => sum + drink.sugarGrams, 0);

    const handleDeleteDrink = async (drinkId: string) => {
        if (db && userId) {
            try {
                await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/drinks/${drinkId}`));
            } catch (error) { console.error("Error deleting drink:", error); }
        }
    };

    if (isConfigMissing) {
        return (
            <div className="bg-gray-900 text-white min-h-screen flex flex-col items-center justify-center p-8 text-center">
                <AlertTriangle className="w-16 h-16 text-yellow-400 mb-4" />
                <h1 className="text-3xl font-bold mb-2">Firebase Configuration Missing</h1>
                <p className="text-lg text-gray-300 max-w-2xl">Please provide your Firebase project's configuration in the `firebaseConfig` object in the code to connect the app to its database.</p>
            </div>
        );
    }
    
    return (
        <div className="bg-gray-900 text-white min-h-screen font-sans antialiased">
            <style>{`
                /* Animation styles from user's code */
            `}</style>
            <Notification
                message={notification?.message || ''}
                type={notification?.type || 'success'}
                onClose={() => setNotification(null)}
            />
            <DrinkModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onLogDrink={handleLogDrink} 
                currentRegion={userRegion} 
            />
            <DrinkModal 
                isOpen={showLateLogModal} 
                onClose={() => setShowLateLogModal(false)} 
                onLogDrink={handleLogDrink} 
                currentRegion={userRegion} 
                showDateTimePicker={true} 
            />
            <PremiumModal
                isOpen={isPremiumModalOpen}
                onClose={() => setIsPremiumModalOpen(false)}
                onConfirm={handleGoPremium}
                isLoading={isLoadingPremium}
            />
            
            <header className="p-4 border-b border-gray-800 flex justify-between items-center sticky top-0 bg-gray-900/80 backdrop-blur-md z-40">
                <div className="flex items-center gap-3">
                    <Zap className="text-yellow-400" size={32} />
                    <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-yellow-400 to-orange-500 text-transparent bg-clip-text">{t('app_title')}</h1>
                </div>
                <div className="flex items-center gap-4">
                    <RegionSwitcherFuel currentRegion={userRegion} setRegion={setUserRegion} />
                    <LanguageSwitcher />
                    <button onClick={() => setIsPremiumModalOpen(true)} className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold py-2 px-4 rounded-lg transition-transform hover:scale-105 shadow-lg shadow-yellow-500/20">
                        {t('header_premium_button')}
                    </button>
                </div>
            </header>

            <main className="p-4 md:p-8">
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-8">
                    <div className="lg:col-span-3 bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h2 className="text-3xl font-bold text-white">{t('section_title_impact')}</h2>
                                <p className="text-gray-400">{t('section_subtitle_impact')}</p>
                            </div>
                            <div className="text-right flex-shrink-0 ml-4">
                                <p className="text-gray-400 text-sm">{t('label_total_sugar')}</p>
                                <p className="text-2xl font-bold text-yellow-400">{totalSugarGramsToday.toFixed(1)}g</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-center">
                            <div className="md:col-span-3">
                                <BodyVisual analysis={analysis} drinkCount={todaysDrinks.length} />
                            </div>
                            <div className="space-y-3 md:col-span-2">
                                {analysis && Object.values(analysis).map(region => (
                                    <div key={region.name} className="bg-gray-800 p-3 rounded-lg transition-all hover:bg-gray-700/50">
                                        <div className="flex justify-between items-center">
                                            <span className="font-semibold">{t(region.name)}</span>
                                            <span className={`font-bold text-sm ${region.impactColor}`}>{region.impactWord}</span>
                                        </div>
                                        <p className="text-xs text-gray-400 mt-1">{region.effectText}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <AICoach drinks={todaysDrinks} analysis={analysis} dailySugarGoal={dailySugarGoal} />
                    </div>

                    {isPremium ? (
                        <PremiumDashboard db={db} userId={userId} dailySugarGoal={dailySugarGoal} />
                    ) : (
                        <div className="lg:col-span-2 space-y-8">
                            <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
                                <h3 className="text-xl font-bold mb-4">{t('section_title_control')}</h3>
                                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                                    <button onClick={() => setIsModalOpen(true)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-300 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20">
                                        <Plus size={20} /> {t('button_log_drink')}
                                    </button>
                                    <button onClick={() => setShowLateLogModal(true)} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-300 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20">
                                        <History size={20} /> {t('log_late_drink')}
                                    </button>
                                </div>
                                {/* RESTORED: Quick Log Section */}
                                <div className="mt-6">
                                    <h4 className="text-lg font-bold text-white mb-3">{t('quick_log_title')}</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {Object.keys(globalSugaryDrinkPresets[userRegion] || globalSugaryDrinkPresets['uk']).map(type => {
                                            const preset = (globalSugaryDrinkPresets[userRegion] || globalSugaryDrinkPresets['uk'])[type];
                                            return (
                                                <button
                                                    key={type}
                                                    onClick={() => handleLogDrink({ type: type, volume: preset.volume, sugarGrams: (preset.volume * preset.sugar / 100), timestamp: new Date().toISOString() }, false)}
                                                    className="bg-gray-700 hover:bg-gray-600 text-white text-sm py-2 px-3 rounded-lg transition-colors"
                                                >
                                                    {t(preset.translationKey)}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                            
                            {/* RESTORED: Drink Log Section */}
                            <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
                                <h3 className="text-xl font-bold mb-4">{t('section_title_log')}</h3>
                                <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                                    {todaysDrinks.length > 0 ? todaysDrinks.map(drink => (
                                        <div key={drink.id || ''} className="group flex items-center justify-between bg-gray-800 p-3 rounded-lg hover:bg-gray-700/50">
                                            <div className="flex items-center gap-3">
                                                <Droplet className="text-blue-400" size={18} />
                                                <div>
                                                    <p className="font-semibold capitalize">{t(`drink_${drink.type.toLowerCase()}`) || drink.type}</p>
                                                    <p className="text-xs text-gray-400">{drink.volume}ml / {drink.sugarGrams.toFixed(1)}g sugar</p>
                                                </div>
                                            </div>
                                            <button onClick={() => drink.id && handleDeleteDrink(drink.id)} className="text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    )) : <p className="text-center text-gray-500 py-8">{t('log_empty')}</p>}
                                </div>
                            </div>

                            {/* RESTORED: Premium Features Section */}
                            <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
                                <div className="flex items-center mb-4">
                                    <Star className="text-yellow-400" /><h3 className="text-xl font-bold ml-2">{t('section_title_premium')}</h3>
                                </div>
                                <div className="space-y-4">
                                    <PremiumFeature title={t('premium_feature_trends_title') as string} description={t('premium_feature_trends_desc') as string} icon={<BarChart3 className="text-gray-400" />} onUpgrade={() => setIsPremiumModalOpen(true)} />
                                    <PremiumFeature title={t('premium_feature_insights_title') as string} description={t('premium_feature_insights_desc') as string} icon={<TrendingUp className="text-gray-400" />} onUpgrade={() => setIsPremiumModalOpen(true)} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

export default function LumenFuelApp() {
    return (
        <LanguageProvider>
            <AppContent />
        </LanguageProvider>
    );
}

