import React, { useState, useEffect, useCallback, createContext, useContext, FC, ReactNode } from 'react';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, Auth } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, query, doc, deleteDoc, Firestore, getDocs } from 'firebase/firestore';
import { Droplet, BarChart3, Info, X, Plus, Star, Lock, Trash2, TrendingUp, Globe, Sparkles, AlertTriangle, Zap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// --- Type Definitions for TypeScript ---
interface SugaryDrink {
    id?: string;
    type: string;
    volume: number;
    sugarGrams: number;
    timestamp: string;
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

// --- Firebase Configuration ---
const firebaseConfig: { [key: string]: string } = {
    apiKey: "AIzaSyAcfkDIVV21EomfdNY2AQ-EZNKt8dgVZEM",
    authDomain: "lumendose.firebaseapp.com",
    projectId: "lumendose",
    storageBucket: "lumendose.firebasestorage.app",
    messagingSenderId: "493600405201",
    appId: "1:493600405201:web:20c4bacbc98e77906e37f0"
};

const appId = 'lumenfuel-app-standalone';

// --- Gemini API Key ---
const GEMINI_API_KEY = "AIzaSyCh7YqkGuLqlWfZr2OzfqJrl6dilDO4YVM";


// --- I18N (Internationalization) Setup ---
const translations: Translations = {
    en: {
        app_title: "LumenFuel",
        header_premium_button: "Go Premium",
        section_title_impact: "Real-Time Body Impact",
        section_subtitle_impact: "Educational model of sugar's short-term effects.",
        label_total_sugar: "Total Sugar",
        section_title_control: "Fuel Intake",
        button_log_drink: "Log a Drink",
        disclaimer_title: "Disclaimer",
        disclaimer_text: "LumenFuel is an educational tool, not medical advice. Consult a professional for health guidance.",
        section_title_log: "Current Drink Log",
        log_empty: "No drinks logged yet.",
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
    },
    // ... other languages can be added here ...
};

const LanguageContext = createContext<{
    language: string;
    setLanguage: (lang: string) => void;
    t: (key: string, ...args: any[]) => string;
} | undefined>(undefined);

const LanguageProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const [language, setLanguage] = useState('en');
    const t = useCallback((key: string, ...args: any[]): string => {
        const translation = translations[language]?.[key] || translations['en']?.[key];
        if (typeof translation === 'function') {
            return translation(...args);
        }
        return translation as string || key;
    }, [language]);

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

const useTranslation = () => {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useTranslation must be used within a LanguageProvider');
    }
    return context;
};

// --- Body Impact Data & Simulation ---
const bodyRegionsData: { [key: string]: { name: string; sensitivity: number; } } = {
    pancreas: { name: "Pancreas", sensitivity: 1.5 },
    liver: { name: "Liver", sensitivity: 1.2 },
    energy: { name: "Energy Levels", sensitivity: 1.8 },
};

const analyzeSugarConsumption = (drinks: SugaryDrink[], t: (key: string, ...args: any[]) => string): Analysis => {
    const totalSugarGrams = drinks.reduce((acc, drink) => acc + drink.sugarGrams, 0);
    let analysis: Analysis = {};
    let overallImpactLevel = 0;
    if (totalSugarGrams > 0) {
        overallImpactLevel = Math.min(Math.log1p(totalSugarGrams / 5) * 1.8, 5);
    }
    
    Object.keys(bodyRegionsData).forEach(key => {
        const region = bodyRegionsData[key];
        const regionImpact = Math.min(overallImpactLevel * region.sensitivity, 5);
        let effectText: string, impactColor: string, impactWord: string;

        if (regionImpact <= 1.5) {
            impactWord = t('impact_low');
            impactColor = 'text-green-400';
            effectText = t(`impact_${key}_low`);
        } else if (regionImpact <= 3.5) {
            impactWord = t('impact_moderate');
            impactColor = 'text-yellow-400';
            effectText = t(`impact_${key}_moderate`);
        } else {
            impactWord = t('impact_high');
            impactColor = 'text-red-500';
            effectText = t(`impact_${key}_high`);
        }
        analysis[key] = { name: region.name, impact: regionImpact, effectText, impactColor, impactWord };
    });
    return analysis;
};

// --- React Components ---

const AICoach: FC<{ drinks: SugaryDrink[]; analysis: Analysis | null }> = ({ drinks, analysis }) => {
    const { t } = useTranslation();
    const [insight, setInsight] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isVisible, setIsVisible] = useState(true);
    const [isKeyMissing, setIsKeyMissing] = useState(false);

    const generateInsight = useCallback(async () => {
        if (!GEMINI_API_KEY) {
            setIsKeyMissing(true);
            return;
        }
        if (!drinks || drinks.length < 2 || !analysis) return;
        
        setIsKeyMissing(false);
        setIsLoading(true);
        setInsight('');

        const sessionSummary = drinks.map(d => `${d.volume}ml of ${d.type} containing ${d.sugarGrams}g of sugar`).join(', ');
        const totalSugar = drinks.reduce((sum, d) => sum + d.sugarGrams, 0).toFixed(1);
        
        const prompt = `
            As an expert on nutrition and metabolic health, you are an AI Coach for the app LumenFuel.
            A user has logged the following sugary drinks in a session: ${sessionSummary}.
            This amounts to ${totalSugar}g of sugar.
            The current analysis shows a high impact on their energy levels and pancreas.
            Provide a single, concise, actionable, and non-judgmental insight (around 20-30 words).
            Focus on a specific, helpful suggestion related to their current consumption pattern (e.g., suggesting water, a lower-sugar alternative, or eating protein to balance the spike).
            Do not use generic phrases. Be specific and encouraging.
            Example: "That's a significant sugar rush. A short walk can help your body use that energy and soften the potential crash later."
        `;

        try {
            let chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
            const payload = { contents: chatHistory };
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            if (result.candidates && result.candidates[0]?.content?.parts[0]?.text) {
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
    }, [drinks, analysis]);

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
                {isKeyMissing ? (
                    <p className="text-yellow-400">{t('ai_coach_no_key')}</p>
                ) : isLoading ? (
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-dashed rounded-full animate-spin border-white"></div>
                        <span>{t('ai_coach_generating')}</span>
                    </div>
                ) : (
                    <p>{insight}</p>
                )}
            </div>
        </div>
    );
};

const BodyVisual: FC<{ analysis: Analysis | null; drinkCount: number }> = ({ analysis, drinkCount }) => {
    const getImpactColor = (impact: number) => {
        if (impact > 3.5) return '#ef4444'; // Red-500
        if (impact > 1.5) return '#facc15'; // Yellow-400
        return '#4ade80'; // Green-400
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


const DrinkModal: FC<{ isOpen: boolean; onClose: () => void; onLogDrink: (drink: Omit<SugaryDrink, 'id'>) => void }> = ({ isOpen, onClose, onLogDrink }) => {
    const { t } = useTranslation();
    const [drinkType, setDrinkType] = useState('soda');
    const [volume, setVolume] = useState(355);
    const [sugarPer100ml, setSugarPer100ml] = useState(10.6);
    
    const drinkPresets: { [key: string]: { volume: number; sugar: number } } = { 
        soda: { volume: 355, sugar: 10.6 }, 
        juice: { volume: 250, sugar: 10 }, 
        energy_drink: { volume: 250, sugar: 11 },
        sweet_tea: { volume: 500, sugar: 8 },
        sports_drink: { volume: 500, sugar: 6 },
    };

    // Effect to reset values to the default preset when modal opens
    useEffect(() => {
        if (isOpen) {
            const defaultType = 'soda'; // Set your desired default drink type here
            setDrinkType(defaultType);
            const preset = drinkPresets[defaultType];
            setVolume(preset.volume);
            setSugarPer100ml(preset.sugar);
        }
    }, [isOpen]); // Only runs when isOpen changes

    // Handle change for drink type dropdown
    const handleDrinkTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newType = e.target.value;
        setDrinkType(newType);
        // Update volume and sugarPer100ml based on the newly selected preset
        const preset = drinkPresets[newType] || drinkPresets['soda']; // Fallback to 'soda' if type not found
        setVolume(preset.volume);
        setSugarPer100ml(preset.sugar);
    };


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const totalSugarGrams = (volume * sugarPer100ml) / 100;
        onLogDrink({ type: drinkType, volume: Number(volume), sugarGrams: totalSugarGrams, timestamp: new Date().toISOString() });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-md border border-gray-700">
                <div className="flex justify-between items-center mb-4"><h2 className="text-2xl font-bold text-white">{t('modal_title')}</h2><button onClick={onClose} className="text-gray-400 hover:text-white"><X size={24} /></button></div>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4"><label className="block text-sm font-medium text-gray-300 mb-2">{t('modal_drink_type')}</label>
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
                            {/* Input for volume - now directly controlled by volume state */}
                            <input type="number" value={volume} onChange={(e) => setVolume(Number(e.target.value))} className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">{t('modal_sugar')}</label>
                            {/* Input for sugarPer100ml - now directly controlled by sugarPer100ml state */}
                            <input type="number" value={sugarPer100ml} step="0.1" onChange={(e) => setSugarPer100ml(Number(e.target.value))} className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                        </div>
                    </div>
                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-300 flex items-center justify-center gap-2"><Plus size={20} /> {t('modal_add_button')}</button>
                </form>
            </div>
        </div>
    );
};

const PremiumModal: FC<{ isOpen: boolean; onClose: () => void; onConfirm: () => void; }> = ({ isOpen, onClose, onConfirm }) => {
    const { t } = useTranslation();
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-gray-700 text-center">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex-grow flex justify-center">
                        <Star className="text-yellow-400" size={40} />
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={24} /></button>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">{t('premium_modal_title')}</h2>
                <p className="text-gray-300 mb-6">{t('premium_modal_text')}</p>
                <button onClick={onConfirm} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                    {t('premium_modal_button')}
                </button>
            </div>
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

const LanguageSwitcher: FC = () => {
    const { language, setLanguage } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);

    const languages: { [key: string]: string } = {
        en: "English",
        de: "Deutsch",
        'fr-CA': "Français (CA)",
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

// --- PREMIUM COMPONENTS ---

const HistoricalChart: FC<{ db: Firestore | null; userId: string | null; }> = ({ db, userId }) => {
    const { t } = useTranslation();
    const [data, setData] = useState<WeeklyChartData[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!db || !userId) return;
            setIsLoading(true);
            const drinksCollectionPath = `artifacts/${appId}/users/${userId}/drinks`;
            const querySnapshot = await getDocs(query(collection(db, drinksCollectionPath)));
            const allDrinks: SugaryDrink[] = [];
            querySnapshot.forEach((doc) => {
                allDrinks.push({ id: doc.id, ...doc.data() } as SugaryDrink);
            });

            if (allDrinks.length === 0) {
                setIsLoading(false);
                return;
            }

            const weeklyData: { [key: string]: number } = {};
            allDrinks.forEach(drink => {
                const date = new Date(drink.timestamp);
                const year = date.getFullYear();
                const week = Math.floor((date.getTime() - new Date(year, 0, 1).getTime()) / (1000 * 60 * 60 * 24 * 7));
                const weekKey = `${year}-W${week}`;
                if (!weeklyData[weekKey]) {
                    weeklyData[weekKey] = 0;
                }
                weeklyData[weekKey] += drink.sugarGrams;
            });

            const chartData = Object.entries(weeklyData).map(([name, sugar]) => ({ name, sugar })).slice(-8);
            setData(chartData);
            setIsLoading(false);
        };
        fetchData();
    }, [db, userId]);

    if (isLoading) {
        return <div className="text-center text-gray-400 p-8">{t('chart_loading')}</div>;
    }

    if (data.length === 0) {
        return <div className="text-center text-gray-400 p-8">{t('chart_no_data')}</div>;
    }

    return (
        <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" />
                    <YAxis stroke="rgba(255,255,255,0.5)" />
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} />
                    <Legend />
                    <Bar dataKey="sugar" fill="#8884d8" name="Grams of Sugar per Week" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

const LongTermAICoach: FC<{ db: Firestore | null; userId: string | null; }> = ({ db, userId }) => {
    const { t } = useTranslation();
    const [insight, setInsight] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const generateLongTermInsight = async () => {
            if (!GEMINI_API_KEY) {
                setInsight(t('ai_coach_no_key'));
                setIsLoading(false);
                return;
            }
            if (!db || !userId) return;

            setIsLoading(true);
            const drinksCollectionPath = `artifacts/${appId}/users/${userId}/drinks`;
            const querySnapshot = await getDocs(query(collection(db, drinksCollectionPath)));
            const allDrinks: SugaryDrink[] = [];
            querySnapshot.forEach((doc) => {
                allDrinks.push({ id: doc.id, ...doc.data() } as SugaryDrink);
            });

            if (allDrinks.length < 5) {
                setInsight("Keep logging your drinks to unlock long-term insights!");
                setIsLoading(false);
                return;
            }

            const totalDrinks = allDrinks.length;
            const mostCommonDay = new Date(allDrinks[0].timestamp).toLocaleDateString('en-US', { weekday: 'long' });
            const avgSugar = allDrinks.reduce((sum, d) => sum + d.sugarGrams, 0) / totalDrinks;

            const prompt = `
                As an expert on nutrition, you are an AI Coach for the app LumenFuel.
                A user has a long-term history of ${totalDrinks} sugary drinks. Their most frequent consumption day appears to be ${mostCommonDay}. Their average drink contains ${avgSugar.toFixed(1)}g of sugar.
                Provide a single, concise, actionable, and non-judgmental long-term insight (around 20-30 words).
                Focus on a helpful observation about their overall pattern.
                Example: "Your sugar intake is highest on weekends. Swapping one soda for sparkling water on Saturday could be a great first step."
            `;
            
            try {
                let chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
                const payload = { contents: chatHistory };
                const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const result = await response.json();
                if (result.candidates && result.candidates[0]?.content?.parts[0]?.text) {
                    setInsight(result.candidates[0].content.parts[0].text);
                } else {
                    setInsight("Could not generate a long-term insight at this time.");
                }
            } catch (error) {
                console.error("Error generating long-term AI insight:", error);
                setInsight("There was an issue connecting to the AI coach.");
            } finally {
                setIsLoading(false);
            }
        };
        generateLongTermInsight();
    }, [db, userId, t]);

    return (
        <div className="bg-gradient-to-br from-purple-500/20 to-indigo-500/20 rounded-2xl p-6 border border-purple-400/30 shadow-lg">
            <div className="flex items-center gap-3 mb-3">
                <Sparkles className="text-purple-300" size={24} />
                <h3 className="text-xl font-bold text-white">{t('long_term_insights_title')}</h3>
            </div>
            <div className="text-purple-100/90 text-sm">
                {isLoading ? (
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-dashed rounded-full animate-spin border-white"></div>
                        <span>{t('ai_coach_generating')}</span>
                    </div>
                ) : (
                    <p>{insight}</p>
                )}
            </div>
        </div>
    );
};


const PremiumDashboard: FC<{ db: Firestore | null; userId: string | null; }> = ({ db, userId }) => {
    const { t } = useTranslation();
    return (
        <div className="lg:col-span-2 space-y-8">
            <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
                <div className="flex items-center mb-4">
                    <BarChart3 className="text-yellow-400" />
                    <h3 className="text-xl font-bold ml-2">{t('historical_trends_title')}</h3>
                </div>
                <HistoricalChart db={db} userId={userId} />
            </div>
            <LongTermAICoach db={db} userId={userId} />
        </div>
    );
};


// Main App Component
function AppContent() {
    const { t } = useTranslation();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
    const [drinks, setDrinks] = useState<SugaryDrink[]>([]);
    const [analysis, setAnalysis] = useState<Analysis | null>(null);
    const [db, setDb] = useState<Firestore | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [isPremium, setIsPremium] = useState(false);
    const [isConfigMissing, setIsConfigMissing] = useState(false);

    useEffect(() => {
        if (Object.keys(firebaseConfig).length === 0 || !firebaseConfig.apiKey) {
            setIsConfigMissing(true);
            return;
        }
        setIsConfigMissing(false);
        try {
            const app: FirebaseApp = initializeApp(firebaseConfig);
            const firestoreDb: Firestore = getFirestore(app);
            const firebaseAuth: Auth = getAuth(app);
            setDb(firestoreDb);
            const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
                if (user) {
                    setUserId(user.uid);
                } else {
                    await signInAnonymously(firebaseAuth);
                }
            });
            return () => unsubscribe();
        } catch (e) { console.error("Error initializing Firebase:", e); }
    }, []);

    useEffect(() => {
        if (db && userId) {
            const drinksCollectionPath = `artifacts/${appId}/users/${userId}/drinks`;
            const q = query(collection(db, drinksCollectionPath));
            const unsubscribe = onSnapshot(q, (querySnapshot) => {
                const drinksData: SugaryDrink[] = [];
                querySnapshot.forEach((doc) => { drinksData.push({ id: doc.id, ...doc.data() } as SugaryDrink); });
                drinksData.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                setDrinks(drinksData);
            }, (error) => { console.error("Error listening to drinks collection:", error); });
            return () => unsubscribe();
        }
    }, [db, userId]);

    useEffect(() => { setAnalysis(analyzeSugarConsumption(drinks, t)); }, [drinks, t]);

    const handleLogDrink = async (drinkData: Omit<SugaryDrink, 'id'>) => {
        if (db && userId) {
            try {
                const drinksCollectionPath = `artifacts/${appId}/users/${userId}/drinks`;
                await addDoc(collection(db, drinksCollectionPath), drinkData);
            } catch (error) { console.error("Error adding drink to Firestore: ", error); }
        }
    };
    
    const handleDeleteDrink = async (drinkId: string) => {
        if (db && userId) {
            try {
                const drinkDocPath = `artifacts/${appId}/users/${userId}/drinks/${drinkId}`;
                await deleteDoc(doc(db, drinkDocPath));
            } catch (error) { console.error("Error deleting drink:", error); }
        }
    };

    const handleOpenPremiumModal = () => setIsPremiumModalOpen(true);
    const handleConfirmPremium = () => {
        setIsPremium(true);
        setIsPremiumModalOpen(false);
    };

    const totalSugar = drinks.reduce((sum, drink) => sum + drink.sugarGrams, 0).toFixed(1);

    if (isConfigMissing) {
        return (
            <div className="bg-gray-900 text-white min-h-screen flex flex-col items-center justify-center p-8 text-center">
                <AlertTriangle className="w-16 h-16 text-yellow-400 mb-4" />
                <h1 className="text-3xl font-bold mb-2">Firebase Configuration Missing</h1>
                <p className="text-lg text-gray-300 max-w-2xl">
                    To connect the app to its database, you need to add your Firebase project's configuration keys.
                </p>
                <div className="mt-6 text-left bg-gray-800 p-4 rounded-lg max-w-xl w-full">
                    <p className="text-md font-semibold mb-2">Action Required:</p>
                    <ol className="list-decimal list-inside space-y-2 text-gray-400">
                        <li>Go to your Firebase project settings.</li>
                        <li>Find and copy the `firebaseConfig` object.</li>
                        <li>In the code editor, find the `firebaseConfig` constant.</li>
                        <li>Replace the empty `{}` with the object you copied.</li>
                    </ol>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gray-900 text-white min-h-screen font-sans antialiased">
            <style>
                {`
                    @keyframes pulse-organ {
                        0%, 100% { transform: scale(1); opacity: 0.8; }
                        50% { transform: scale(1.05); opacity: 1; }
                    }
                    .organ-pulse {
                        animation: pulse-organ var(--pulse-duration) ease-in-out infinite;
                    }
                    .dose-animation-container {
                        position: absolute;
                        width: 100%;
                        height: 100%;
                        top: 0;
                        left: 0;
                        z-index: 20;
                        pointer-events: none;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    .dose-droplet {
                        position: absolute;
                        color: #fde047; /* yellow-300 */
                        filter: drop-shadow(0 0 8px #facc15);
                        opacity: 0;
                        animation: travel-up-sugar 0.8s ease-out forwards;
                    }
                    @keyframes travel-up-sugar {
                        0% { transform: translateY(100px) scale(0.5); opacity: 0; }
                        50% { opacity: 1; }
                        100% { transform: translateY(0) scale(1); opacity: 0; }
                    }
                    .dose-splash {
                        position: absolute;
                        width: 20px;
                        height: 20px;
                        border-radius: 50%;
                        background: #fde047;
                        opacity: 0;
                        animation: splash-sugar 0.6s 0.8s ease-out forwards;
                    }
                    @keyframes splash-sugar {
                        0% { opacity: 1; transform: scale(0); box-shadow: 0 0 0 0 rgba(250, 204, 21, 0.7); }
                        100% { opacity: 0; transform: scale(8); box-shadow: 0 0 25px 35px rgba(250, 204, 21, 0); }
                    }
                    .dose-zap {
                        position: absolute;
                        color: #fde047;
                        filter: drop-shadow(0 0 8px #facc15);
                        opacity: 0;
                        animation: zap-effect 0.5s 1.1s ease-out forwards;
                    }
                    @keyframes zap-effect {
                        0% { transform: scale(0.5); opacity: 0; }
                        50% { transform: scale(1.5); opacity: 1; }
                        100% { transform: scale(1.2); opacity: 0; }
                    }
                `}
            </style>
            <DrinkModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onLogDrink={handleLogDrink} />
            <PremiumModal isOpen={isPremiumModalOpen} onClose={() => setIsPremiumModalOpen(false)} onConfirm={handleConfirmPremium} />

            <header className="p-4 border-b border-gray-800 flex justify-between items-center sticky top-0 bg-gray-900/80 backdrop-blur-md z-40">
                <div className="flex items-center gap-3"><Zap className="text-yellow-400" size={32} /><h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-yellow-400 to-orange-500 text-transparent bg-clip-text">{t('app_title')}</h1></div>
                <div className="flex items-center gap-4">
                    <LanguageSwitcher />
                    <button onClick={handleOpenPremiumModal} className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold py-2 px-4 rounded-lg transition-transform hover:scale-105 shadow-lg shadow-yellow-500/20">{t('header_premium_button')}</button>
                </div>
            </header>
            <main className="p-4 md:p-8">
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-8">
                    <div className="lg:col-span-3 bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
                        <div className="flex justify-between items-start mb-4"><div><h2 className="text-3xl font-bold text-white">{t('section_title_impact')}</h2><p className="text-gray-400">{t('section_subtitle_impact')}</p></div><div className="text-right flex-shrink-0 ml-4"><p className="text-gray-400 text-sm">{t('label_total_sugar')}</p><p className="text-2xl font-bold text-yellow-400">{totalSugar}g</p></div></div>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-center">
                            <div className="md:col-span-3">
                                <BodyVisual analysis={analysis} drinkCount={drinks.length} />
                            </div>
                            <div className="space-y-3 md:col-span-2">
                                {analysis && Object.values(analysis).map(region => (<div key={region.name} className="bg-gray-800 p-3 rounded-lg transition-all hover:bg-gray-700/50"><div className="flex justify-between items-center"><span className="font-semibold">{region.name}</span><span className={`font-bold text-sm ${region.impactColor}`}>{region.impactWord}</span></div><p className="text-xs text-gray-400 mt-1">{region.effectText}</p></div>))}
                            </div>
                        </div>
                        <AICoach drinks={drinks} analysis={analysis} />
                    </div>
                    {isPremium ? (
                        <PremiumDashboard db={db} userId={userId} />
                    ) : (
                        <div className="lg:col-span-2 space-y-8">
                            <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50"><h3 className="text-xl font-bold mb-4">{t('section_title_control')}</h3><button onClick={() => setIsModalOpen(true)} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-300 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"><Plus size={20} /> {t('button_log_drink')}</button><div className="mt-6 p-4 bg-yellow-900/30 border border-yellow-700 rounded-lg flex items-start gap-3"><Info size={20} className="text-yellow-400 mt-1 flex-shrink-0" /><div><h4 className="font-bold text-yellow-300">{t('disclaimer_title')}</h4><p className="text-xs text-yellow-300/80">{t('disclaimer_text')}</p></div></div></div>
                            <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50"><h3 className="text-xl font-bold mb-4">{t('section_title_log')}</h3><div className="space-y-3 max-h-60 overflow-y-auto pr-2">{drinks.length > 0 ? drinks.map(drink => (<div key={drink.id || ''} className="group flex items-center justify-between bg-gray-800 p-3 rounded-lg hover:bg-gray-700/50"><div className="flex items-center gap-3"><Droplet className="text-blue-400" size={18} /><div><p className="font-semibold capitalize">{t(`drink_${drink.type.toLowerCase()}`) || drink.type}</p><p className="text-xs text-gray-400">{drink.volume}ml / {drink.sugarGrams.toFixed(1)}g sugar</p></div></div><div className="flex items-center gap-3"><button onClick={() => drink.id && handleDeleteDrink(drink.id)} className="text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16} /></button></div></div>)) : <p className="text-center text-gray-500 py-8">{t('log_empty')}</p>}</div></div>
                            <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50"><div className="flex items-center mb-4"><Star className="text-yellow-400" /><h3 className="text-xl font-bold ml-2">{t('section_title_premium')}</h3></div><div className="space-y-4"><PremiumFeature title={t('premium_feature_trends_title') as string} description={t('premium_feature_trends_desc') as string} icon={<BarChart3 className="text-gray-400" />} onUpgrade={handleOpenPremiumModal} /><PremiumFeature title={t('premium_feature_insights_title') as string} description={t('premium_feature_insights_desc') as string} icon={<TrendingUp className="text-gray-400" />} onUpgrade={handleOpenPremiumModal} /></div></div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

export default function App() {
    return (
        <LanguageProvider>
            <AppContent />
        </LanguageProvider>
    );
}
