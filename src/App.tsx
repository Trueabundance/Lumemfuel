import React, { useState, useEffect, useCallback, createContext, useContext, FC, ReactNode } from 'react';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, Auth } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, query, doc, deleteDoc, Firestore, getDocs, setDoc, getDoc } from 'firebase/firestore';
// Ensured all necessary icons are imported here
import { Droplet, BarChart3, Info, X, Plus, Star, Lock, Trash2, TrendingUp, Globe, Sparkles, AlertTriangle, Zap, Settings, Edit, Save, Award, Share2, CheckCircle, XCircle, History, Calendar } from 'lucide-react';
import confetti from 'canvas-confetti'; // For confetti celebration
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// --- Type Definitions for TypeScript ---
interface SugaryDrink {
    id?: string;
    type: string;
    volume: number;
    sugarGrams: number;
    timestamp: string;
}

interface CustomQuickAddSugar {
    id?: string;
    type: string;
    volume: number;
    sugar: number; // sugar per 100ml
    label: string; // User-defined label for the button
}

interface BodyImpactAnalysis {
    name: string; // This will now be the translation key
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
    nameKey: string; // Translation key for achievement name
    descriptionKey: string; // Translation key for description
    earnedDate: string;
}

interface DailyChallenge {
    id: string;
    textKey: string; // Translation key for the challenge description
    completed: boolean;
    type: 'log_n_drinks' | 'stay_below_goal' | 'use_custom_quick_add';
    value?: number; // e.g., for 'log_n_drinks', value = 2
}


// --- Firebase Configuration ---
const firebaseConfig: { [key: string]: string } = {
    apiKey: "AIzaSyAJp_KxTH-ICD8CKIUIzMjeN4sumj62Pbk", // FIX: Replaced with provided valid API key
    authDomain: "thyraqfuel.firebaseapp.com",
    projectId: "thyraqfuel",
    storageBucket: "thyraqfuel.firebasestorage.app",
    messagingSenderId: "828610666370",
    appId: "1:828610666370:web:66bd9755838a9aeedc399b"
     measurementId: "G-WP5VTSH45G" // Updated with user's provided measurementId
};

const appId = 'lumenfuel-app-standalone'; // Kept user's provided appId for this app

// --- Gemini API Key ---
const GEMINI_API_KEY = "AIzaSyCh7YqkGuLqlWfZr2OzfqJrl6dilDO4YVM";

// --- Global Drink Presets for LumenFuel (Sugary Drinks) ---
const globalSugaryDrinkPresets: { [region: string]: { [key: string]: { volume: number; sugar: number; translationKey: string; } } } = {
    'uk': {
        soda: { volume: 330, sugar: 10.6, translationKey: "quick_add_soda_can" }, // UK can size
        juice: { volume: 200, sugar: 10, translationKey: "quick_add_juice_carton" }, // UK small carton
        energy_drink: { volume: 250, sugar: 11, translationKey: "quick_add_energy_drink_can" }, // Common can size
        sweet_tea: { volume: 500, sugar: 8, translationKey: "quick_add_sweet_tea_bottle" }, // Common bottle size
        sports_drink: { volume: 500, sugar: 6, translationKey: "quick_add_sports_drink_bottle" }, // Common bottle size
    },
    'us': {
        soda: { volume: 355, sugar: 10.6, translationKey: "quick_add_soda_can_us" }, // US 12oz can
        juice: { volume: 236, sugar: 10, translationKey: "quick_add_juice_box_us" }, // US 8oz juice box
        energy_drink: { volume: 240, sugar: 11, translationKey: "quick_add_energy_drink_can_us" }, // US 8oz can
        sweet_tea: { volume: 473, sugar: 8, translationKey: "quick_add_sweet_tea_bottle_us" }, // US 16oz bottle
        sports_drink: { volume: 591, sugar: 6, translationKey: "quick_add_sports_drink_bottle_us" }, // US 20oz bottle
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
        label_total_sugar: "Total Sugar",
        section_title_control: "Fuel Intake",
        button_log_drink: "Log a Drink",
        disclaimer_title: "Disclaimer",
        disclaimer_text: "LumenFuel is an educational tool, not medical advice. Consult a professional for health guidance.",
        section_title_log: "Current Drink Log",
        log_empty: "No drinks logged yet.",
        section_title_premium: "Premium Features",
        modal_title: "Log a Sugary Drink",
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
        quick_add_soda_can: "Soda Can (330ml, 10.6g/100ml)", // UK specific
        quick_add_juice_carton: "Juice Carton (200ml, 10g/100ml)", // UK specific
        quick_add_energy_drink_can: "Energy Drink (250ml, 11g/100ml)",
        quick_add_sweet_tea_bottle: "Sweet Tea (500ml, 8g/100ml)",
        quick_add_sports_drink_bottle: "Sports Drink (500ml, 6g/100ml)",
        quick_add_soda_can_us: "Soda Can (355ml, 10.6g/100ml)", // US specific
        quick_add_juice_box_us: "Juice Box (236ml, 10g/100ml)", // US specific
        quick_add_energy_drink_can_us: "Energy Drink (240ml, 11g/100ml)",
        quick_add_sweet_tea_bottle_us: "Sweet Tea (473ml, 8g/100ml)",
        quick_add_sports_drink_bottle_us: "Sports Drink (591ml, 6g/100ml)",
        region_selector_title: "Region",
        region_uk: "United Kingdom",
        region_us: "United States",
        region_au: "Australia",
        region_de: "Germany",
        // Body region names for translation
        region_pancreas: "Pancreas",
        region_liver: "Liver",
        region_energy: "Energy Levels",
        // Custom Quick Add & Goals
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
        // Achievements
        achievements_title: "Achievements",
        achievement_first_log_name: "First Taste",
        achievement_first_log_desc: "Logged your first sugary drink!",
        achievement_7_day_streak_name: "7-Day Streak",
        achievement_7_day_streak_desc: "Logged drinks for 7 consecutive days!",
        achievement_30_day_streak_name: "30-Day Streak",
        achievement_30_day_streak_desc: "Logged drinks for 30 consecutive days!",
        achievement_5_goal_name: "Goal Setter Novice",
        achievement_5_goal_desc: "Hit your daily goal 5 times!",
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
        log_late_drink: "Log Late Drink", // New translation key for late add
    },
    de: { // German translations
        app_title: "LumenKraftstoff",
        header_premium_button: "Premium werden",
        section_title_impact: "Echtzeit-Körperauswirkung",
        section_subtitle_impact: "Bildungsmodell der kurzfristigen Auswirkungen von Zucker.",
        label_total_sugar: "Gesamtzucker",
        section_title_control: "Kraftstoffaufnahme",
        button_log_drink: "Getränk protokollieren",
        disclaimer_title: "Haftungsausschluss",
        disclaimer_text: "LumenKraftstoff ist ein Bildungstool, keine medizinische Beratung. Konsultieren Sie einen Fachmann für Gesundheitsberatung.",
        section_title_log: "Aktuelles Getränkeprotokoll",
        log_empty: "Noch keine Getränke protokolliert.",
        section_title_premium: "Premium-Funktionen",
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
        ai_coach_no_key: "KI-Coach ist deaktiviert. Ein Gemini-API-Schlüssel ist für diese Funktion erforderlich.",
        premium_dashboard_title: "Premium-Dashboard",
        historical_trends_title: "Ihre wöchentlichen Zuckertrends",
        long_term_insights_title: "Langfristige KI-Einblicke",
        chart_loading: "Historische Daten werden geladen...",
        chart_no_data: "Nicht genügend Daten, um Trends anzuzeigen. Protokollieren Sie weiterhin Ihre Getränke!",
        premium_modal_title: "Premium freischalten!",
        premium_modal_text: "Greifen Sie auf historische Trends, erweiterte KI-Einblicke und mehr zu, indem Sie Premium werden!",
        premium_modal_button: "Jetzt freischalten",
        premium_feature_trends_title: "Historische Trends",
        premium_feature_trends_desc: "Visualisieren Sie Ihre Zuckeraufnahme im Laufe der Zeit mit interaktiven Diagrammen.",
        premium_feature_insights_title: "Long-Term AI Insights",
        premium_feature_insights_desc: "Erhalten Sie personalisierte Ratschläge basierend auf Ihren langfristigen Konsummustern.",
        quick_log_title: "Schnell hinzufügen",
        quick_add_soda_can: "Limonadendose (330ml, 10.6g/100ml)", // UK specific
        quick_add_juice_carton: "Saftkarton (200ml, 10g/100ml)", // UK specific
        quick_add_energy_drink_can: "Energy-Drink (250ml, 11g/100ml)",
        quick_add_sweet_tea_bottle: "Süßer Tee (500ml, 8g/100ml)",
        quick_add_sports_drink_bottle: "Sportgetränk (500ml, 6g/100ml)",
        quick_add_soda_can_us: "Limonadendose (355ml, 10.6g/100ml)", // US specific
        quick_add_juice_box_us: "Saftbox (236ml, 10g/100ml)", // US specific
        quick_add_energy_drink_can_us: "Energy-Drink (240ml, 11g/100ml)",
        quick_add_sweet_tea_bottle_us: "Süßer Tee (473ml, 8g/100ml)",
        quick_add_sports_drink_bottle_us: "Sportgetränk (591ml, 6g/100ml)",
        region_selector_title: "Region",
        region_uk: "Vereinigtes Königreich",
        region_us: "Vereinigte Staaten",
        region_au: "Australien",
        region_de: "Deutschland",
        // Body region names for translation
        region_pancreas: "Bauchspeicheldrüse",
        region_liver: "Leber",
        region_energy: "Energielevel",
        // Custom Quick Add & Goals
        manage_quick_adds: "Schnell-Hinzufügungen verwalten",
        add_custom_quick_add: "Benutzerdefinierte Schnell-Hinzufügung hinzufügen",
        edit_custom_quick_add: "Benutzerdefinierte Schnell-Hinzufügung bearbeiten",
        custom_quick_add_label: "Schaltflächenbeschriftung",
        custom_quick_add_type: "Getränketyp",
        custom_quick_add_volume: "Volumen (ml)",
        custom_quick_add_sugar: "Zucker (g/100ml)",
        save_quick_add: "Schnell-Hinzufügung speichern",
        delete_quick_add: "Löschen",
        no_custom_quick_adds: "Noch keine benutzerdefinierten Schnell-Hinzufügungen.",
        daily_goal_title: "Tägliches Zuckerziel",
        set_goal: "Ziel festlegen (Gramm)",
        current_progress: "Aktueller Fortschritt",
        goal_set_success: "Tägliches Ziel festgelegt!",
        goal_delete_success: "Tägliches Ziel entfernt.",
        goal_not_set: "Kein tägliches Ziel festgelegt.",
        goal_exceeded: "Ziel überschritten!",
        goal_remaining: "verbleibend",
        // Achievements
        achievements_title: "Errungenschaften",
        achievement_first_log_name: "Erster Schluck",
        achievement_first_log_desc: "Ihr erstes zuckerhaltiges Getränk protokolliert!",
        achievement_7_day_streak_name: "7-Tage-Serie",
        achievement_7_day_streak_desc: "7 Tage in Folge Getränke protokolliert!",
        achievement_30_day_streak_name: "30-Tage-Serie",
        achievement_30_day_streak_desc: "30 Tage in Folge Getränke protokolliert!",
        achievement_5_goal_name: "Zielsetzer-Neuling",
        achievement_5_goal_desc: "Ihr Tagesziel 5 Mal erreicht!",
        achievement_10_drinks_name: "Süßer Zahn-Anfänger",
        achievement_10_drinks_desc: "10 zuckerhaltige Getränke protokolliert!",
        achievement_50_drinks_name: "Zucker-Tracker",
        achievement_50_drinks_desc: "50 zuckerhaltige Getränke protokolliert!",
        achievement_100_drinks_name: "Zucker-Meister",
        achievement_100_drinks_desc: "100 zuckerhaltige Getränke protokolliert!",
        no_achievements_yet: "Noch keine Errungenschaften verdient. Protokollieren Sie weiter!",
        share_progress_button: "Fortschritt teilen",
        share_message_goal: "Heute habe ich {grams}g Zucker konsumiert und bleibe mit LumenKraftstoff innerhalb meines Ziels von {goal}g! #GesundeAuswahl #LumenKraftstoff",
        share_message_over_goal: "Heute habe ich {grams}g Zucker konsumiert und mein Ziel von {goal}g überschritten. Zeit zum Nachdenken mit LumenKraftstoff! #Gesundheitsreise #LumenKraftstoff",
        share_message_no_goal: "Heute habe ich {grams}g Zucker konsumiert. Verfolgen Sie Ihre Aufnahme mit LumenKraftstoff! #GesundheitsApp",
        daily_challenge_title: "Tägliche Herausforderung",
        daily_challenge_completed: "Abgeschlossen!",
        daily_challenge_log_n_drinks: "Protokollieren Sie heute mindestens {value} Getränk(e).",
        daily_challenge_stay_below_goal: "Bleiben Sie heute unter {value}g Zucker.",
        daily_challenge_use_custom_quick_add: "Verwenden Sie eine benutzerdefinierte Schnell-Hinzufügung.",
        daily_challenge_no_challenge: "Keine Herausforderung für heute. Viel Spaß beim Protokollieren!",
        log_late_drink: "Getränk nachtragen", // New German translation
    },
    'fr-CA': { // French (Canadian) translations
        app_title: "LumenFuel",
        header_premium_button: "Passer au Premium",
        section_title_impact: "Impact corporel en temps réel",
        section_subtitle_impact: "Modèle éducatif des effets à court terme du sucre.",
        label_total_sugar: "Sucre total",
        section_title_control: "Apport en carburant",
        button_log_drink: "Enregistrer une boisson",
        disclaimer_title: "Avertissement",
        disclaimer_text: "LumenFuel est un outil éducatif, pas un avis médical. Consultez un professionnel de la santé pour des conseils.",
        section_title_log: "Journal de boissons actuel",
        log_empty: "Aucune boisson enregistrée pour le moment.",
        section_title_premium: "Fonctionnalités Premium",
        modal_title: "Enregistrer une boisson sucrée",
        modal_drink_type: "Type de boisson",
        modal_volume: "Volume (ml)",
        modal_sugar: "Sucre (g / 100ml)",
        modal_add_button: "Ajouter au journal",
        drink_soda: "Soda",
        drink_juice: "Jus de fruits",
        drink_energy_drink: "Boisson énergisante",
        drink_sweet_tea: "Thé sucré / Café glacé",
        drink_sports_drink: "Boisson pour sportifs",
        impact_low: "Faible",
        impact_moderate: "Modéré",
        impact_high: "Élevé",
        impact_pancreas_low: "Réponse normale à l'insuline attendue.",
        impact_pancreas_moderate: "Demande accrue du pancréas pour la production d'insuline.",
        impact_pancreas_high: "Pic d'insuline élevé, sollicitant la fonction métabolique.",
        impact_energy_low: "Niveaux d'énergie stables.",
        impact_energy_moderate: "Pic d'énergie rapide, risque de chute ultérieure.",
        impact_energy_high: "Poussée d'énergie intense, probablement suivie d'une chute significative.",
        impact_liver_low: "Traitement hépatique standard.",
        impact_liver_moderate: "Le foie travaille plus fort pour traiter le fructose.",
        impact_liver_high: "Charge de fructose significative, contribuant au stockage des graisses.",
        ai_coach_title: "Insight du Coach IA",
        ai_coach_generating: "Génération de l'insight...",
        ai_coach_no_key: "Le Coach IA est désactivé. Une clé API Gemini est requise pour cette fonction.",
        premium_dashboard_title: "Tableau de bord Premium",
        historical_trends_title: "Vos tendances hebdomadaires de sucre",
        long_term_insights_title: "Insights IA à long terme",
        chart_loading: "Chargement des données historiques...",
        chart_no_data: "Pas assez de données pour afficher les tendances. Continuez à enregistrer vos boissons!",
        premium_modal_title: "Débloquer Premium!",
        premium_modal_text: "Accédez aux tendances historiques, aux insights IA avancés et plus encore en passant au Premium!",
        premium_modal_button: "Débloquer maintenant",
        premium_feature_trends_title: "Tendances historiques",
        premium_feature_trends_desc: "Visualisez votre consommation de sucre au fil du temps avec des graphiques interactifs.",
        premium_feature_insights_title: "Insights IA à long terme",
        premium_feature_insights_desc: "Obtenez des conseils personnalisés basés sur vos habitudes de consommation à long terme.",
        quick_log_title: "Ajout rapide",
        quick_add_soda_can: "Canette de soda (330ml, 10.6g/100ml)",
        quick_add_juice_carton: "Carton de jus (200ml, 10g/100ml)",
        quick_add_energy_drink_can: "Canette de boisson énergisante (250ml, 11g/100ml)",
        quick_add_sweet_tea_bottle: "Bouteille de thé sucré (500ml, 8g/100ml)",
        quick_add_sports_drink_bottle: "Bouteille de boisson sportive (500ml, 6g/100ml)",
        quick_add_soda_can_us: "Canette de soda (355ml, 10.6g/100ml)",
        quick_add_juice_box_us: "Boîte de jus (236ml, 10g/100ml)",
        quick_add_energy_drink_can_us: "Canette de boisson énergisante (240ml, 11g/100ml)",
        quick_add_sweet_tea_bottle_us: "Bouteille de thé sucré (473ml, 8g/100ml)",
        quick_add_sports_drink_bottle_us: "Bouteille de boisson sportive (591ml, 6g/100ml)",
        region_selector_title: "Région",
        region_uk: "Royaume-Uni",
        region_us: "États-Unis",
        region_au: "Australie",
        region_de: "Allemagne",
        // Body region names for translation
        region_pancreas: "Pancréas",
        region_liver: "Foie",
        region_energy: "Niveaux d'énergie",
        // Custom Quick Add & Goals
        manage_quick_adds: "Gérer les ajouts rapides",
        add_custom_quick_add: "Ajouter un ajout rapide personnalisé",
        edit_custom_quick_add: "Modifier l'ajout rapide personnalisé",
        custom_quick_add_label: "Étiquette du bouton",
        custom_quick_add_type: "Type de boisson",
        custom_quick_add_volume: "Volume (ml)",
        custom_quick_add_sugar: "Sucre (g/100ml)",
        save_quick_add: "Enregistrer l'ajout rapide",
        delete_quick_add: "Supprimer",
        no_custom_quick_adds: "Aucun ajout rapide personnalisé pour le moment.",
        daily_goal_title: "Objectif de sucre quotidien",
        set_goal: "Définir l'objectif (grammes)",
        current_progress: "Progrès actuel",
        goal_set_success: "Objectif quotidien défini!",
        goal_delete_success: "Objectif quotidien supprimé.",
        goal_not_set: "Aucun objectif quotidien défini.",
        goal_exceeded: "Objectif dépassé!",
        goal_remaining: "restant",
    },
    ja: { // Japanese translations
        app_title: "ルーメンフューエル",
        header_premium_button: "プレミアムに移行",
        section_title_impact: "リアルタイムの身体への影響",
        section_subtitle_impact: "砂糖の短期的な影響の教育モデル。",
        label_total_sugar: "総砂糖量",
        section_title_control: "燃料摂取量",
        button_log_drink: "飲酒を記録",
        disclaimer_title: "免責事項",
        disclaimer_text: "ルーメンフューエルは教育ツールであり、医療アドバイスではありません。健康に関するガイダンスについては専門家にご相談ください。",
        section_title_log: "現在の飲酒ログ",
        log_empty: "まだ飲酒が記録されていません。",
        section_title_premium: "プレミアム機能",
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
        ai_coach_no_key: "AIコーチは無効です。この機能にはGemini APIキーが必要です。",
        premium_dashboard_title: "プレミアムダッシュボード",
        historical_trends_title: "週次砂糖トレンド",
        long_term_insights_title: "長期AIインサイト",
        chart_loading: "履歴データを読み込み中...",
        chart_no_data: "トレンドを表示するのに十分なデータがありません。飲酒を記録し続けてください！",
        premium_modal_title: "プレミアムをアンロック！",
        premium_modal_text: "プレミアムに移行して、履歴トレンド、高度なAIインサイトなどにアクセスしましょう！",
        premium_modal_button: "今すぐアンロック",
        premium_feature_trends_title: "履歴トレンド",
        premium_feature_trends_desc: "インタラクティブなグラフで時間の経過とともに砂糖摂取量を視覚化します。",
        premium_feature_insights_title: "長期AIインサイト",
        premium_feature_insights_desc: "長期的な消費パターンに基づいたパーソナライズされたアドバイスを受け取ります。",
        quick_log_title: "クイック追加",
        quick_add_soda_can: "ソーダ缶 (330ml, 10.6g/100ml)",
        quick_add_juice_carton: "ジュースカートン (200ml, 10g/100ml)",
        quick_add_energy_drink_can: "エナジードリンク缶 (250ml, 11g/100ml)",
        quick_add_sweet_tea_bottle: "甘いお茶ボトル (500ml, 8g/100ml)",
        quick_add_sports_drink_bottle: "スポーツドリンクボトル (500ml, 6g/100ml)",
        quick_add_soda_can_us: "ソーダ缶 (355ml, 10.6g/100ml)",
        quick_add_juice_box_us: "ジュースボックス (236ml, 10g/100ml)",
        quick_add_energy_drink_can_us: "エナジードリンク缶 (240ml, 11g/100ml)",
        quick_add_sweet_tea_bottle_us: "甘いお茶ボトル (473ml, 8g/100ml)",
        quick_add_sports_drink_bottle_us: "スポーツドリンクボトル (591ml, 6g/100ml)",
        region_selector_title: "地域",
        region_uk: "イギリス",
        region_us: "アメリカ合衆国",
    },
    ko: { // Korean translations
        app_title: "루멘퓨얼",
        header_premium_button: "프리미엄으로 전환",
        section_title_impact: "실시간 신체 영향",
        section_subtitle_impact: "설탕의 단기적 영향에 대한 교육 모델입니다.",
        label_total_sugar: "총 설탕",
        section_title_control: "연료 섭취",
        button_log_drink: "음료 기록",
        disclaimer_title: "면책 조항",
        disclaimer_text: "루멘퓨얼은 교육 도구이며 의학적 조언이 아닙니다. 건강 관련 조언은 전문가와 상담하십시오.",
        section_title_log: "현재 음료 기록",
        log_empty: "아직 기록된 음료가 없습니다.",
        section_title_premium: "프리미엄 기능",
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
        ai_coach_no_key: "AI 코치가 비활성화되었습니다. 이 기능을 사용하려면 Gemini API 키가 필요합니다.",
        premium_dashboard_title: "프리미엄 대시보드",
        historical_trends_title: "주간 설탕 트렌드",
        long_term_insights_title: "장기 AI 통찰력",
        chart_loading: "과거 데이터 로드 중...",
        chart_no_data: "트렌드를 표시할 데이터가 충분하지 않습니다. 계속 음료를 기록하세요!",
        premium_modal_title: "프리미엄 잠금 해제!",
        premium_modal_text: "프리미엄으로 전환하여 과거 트렌드, 고급 AI 통찰력 등에 액세스하세요!",
        premium_modal_button: "지금 잠금 해제",
        premium_feature_trends_title: "과거 트렌드",
        premium_feature_trends_desc: "대화형 차트로 시간 경과에 따른 설탕 섭취량을 시각화합니다。",
        premium_feature_insights_title: "장기 AI 통찰력",
        premium_feature_insights_desc: "장기적인 소비 패턴을 기반으로 개인화된 조언을 받습니다。",
        quick_log_title: "빠른 추가",
        quick_add_soda_can: "탄산음료 캔 (330ml, 10.6g/100ml)",
        quick_add_juice_carton: "주스 카톤 (200ml, 10g/100ml)",
        quick_add_energy_drink_can: "에너지 드링크 캔 (250ml, 11g/100ml)",
        quick_add_sweet_tea_bottle: "달콤한 차 병 (500ml, 8g/100ml)",
        quick_add_sports_drink_bottle: "스포츠 드링크 병 (500ml, 6g/100ml)",
        quick_add_soda_can_us: "탄산음료 캔 (355ml, 10.6g/100ml)",
        quick_add_juice_box_us: "주스 박스 (236ml, 10g/100ml)",
        quick_add_energy_drink_can_us: "에너지 드링크 캔 (240ml, 11g/100ml)",
        quick_add_sweet_tea_bottle_us: "달콤한 차 병 (473ml, 8g/100ml)",
        quick_add_sports_drink_bottle_us: "스포츠 드링크 병 (591ml, 6g/100ml)",
        region_selector_title: "지역",
        region_uk: "영국",
        region_us: "미국",
    }
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
// Updated bodyRegionsData to use translation keys for 'name'
const bodyRegionsData: { [key: string]: { name: string; sensitivity: number; } } = {
    pancreas: { name: "region_pancreas", sensitivity: 1.5 },
    liver: { name: "region_liver", sensitivity: 1.2 },
    energy: { name: "region_energy", sensitivity: 1.8 },
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
        // Use the translation key for the name
        analysis[key] = { name: region.name, impact: regionImpact, effectText, impactColor, impactWord };
    });
    return analysis;
};

// --- React Components ---

const AICoach: FC<{ drinks: SugaryDrink[]; analysis: Analysis | null; dailySugarGoal: number | null; }> = ({ drinks, analysis, dailySugarGoal }) => {
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
        
        let goalContext = "";
        if (dailySugarGoal !== null && dailySugarGoal > 0) {
            const currentGrams = parseFloat(totalSugar);
            if (currentGrams > dailySugarGoal) {
                goalContext = `They have exceeded their daily goal of ${dailySugarGoal}g by ${(currentGrams - dailySugarGoal).toFixed(1)}g.`;
            } else {
                goalContext = `They are currently at ${currentGrams}g towards their daily goal of ${dailySugarGoal}g.`;
            }
        }

        const prompt = `
            As an expert on nutrition, you are an AI Coach for the app LumenFuel.
            A user has logged the following sugary drinks in a session: ${sessionSummary}.
            This amounts to ${totalSugar}g of sugar.
            The current analysis shows a high impact on their energy levels and pancreas.
            ${goalContext}
            Provide a single, concise, actionable, and non-judgmental insight (around 20-30 words).
            Focus on a specific, helpful suggestion related to their current consumption pattern (e.g., suggesting water, a lower-sugar alternative, or eating protein to balance the spike, and goal adherence if applicable).
            Do not use generic phrases. Be specific and encouraging.
            Example: "That's a significant sugar rush. A short walk can help your body use that energy and soften the potential crash later."
            Example for goal exceeded: "You've passed your daily sugar goal. Consider healthier snack options or water for your next intake."
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
    }, [drinks, analysis, t, dailySugarGoal]); // Added dailySugarGoal to dependencies

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
    const { t } = useTranslation(); // Get translation function
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


const DrinkModal: FC<{ isOpen: boolean; onClose: () => void; onLogDrink: (drink: Omit<SugaryDrink, 'id'>) => void; initialDrinkData?: { type: string; volume: number; sugar: number; }; currentRegion: string; showDateTimePicker?: boolean; }> = ({ isOpen, onClose, onLogDrink, initialDrinkData, currentRegion, showDateTimePicker = false }) => {
    const { t } = useTranslation();
    const [drinkType, setDrinkType] = useState('soda');
    const [volume, setVolume] = useState(355);
    const [sugarPer100ml, setSugarPer100ml] = useState(10.6);
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]); // YYYY-MM-DD
    const [selectedTime, setSelectedTime] = useState<string>(new Date().toTimeString().split(' ')[0].substring(0, 5)); // HH:MM
    
    // Using globalSugaryDrinkPresets based on the currentRegion
    const drinkPresets = globalSugaryDrinkPresets[currentRegion] || globalSugaryDrinkPresets['uk'];


    // Effect to reset values to the default preset when modal opens
    useEffect(() => {
        if (isOpen) {
            if (initialDrinkData) {
                setDrinkType(initialDrinkData.type);
                setVolume(initialDrinkData.volume);
                setSugarPer100ml(initialDrinkData.sugar);
            } else {
                const defaultType = 'soda'; // Set your desired default drink type here
                setDrinkType(defaultType);
                const preset = drinkPresets[defaultType];
                setVolume(preset.volume);
                setSugarPer100ml(preset.sugar);
            }
            if (!initialDrinkData) { // Reset date/time for new entries
                const now = new Date();
                setSelectedDate(now.toISOString().split('T')[0]);
                setSelectedTime(now.toTimeString().split(' ')[0].substring(0, 5));
            }
        }
    }, [isOpen, initialDrinkData, drinkPresets]); // Depend on isOpen, initialDrinkData, and drinkPresets

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
        // Construct timestamp based on whether date/time pickers are shown
        let timestamp: string;
        if (showDateTimePicker) {
            timestamp = new Date(`${selectedDate}T${selectedTime}`).toISOString();
        } else {
            timestamp = new Date().toISOString();
        }

        const totalSugarGrams = (volume * sugarPer100ml) / 100;
        onLogDrink({ type: drinkType, volume: Number(volume), sugarGrams: totalSugarGrams, timestamp });
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
                            <input type="number" value={sugarPer100ml} step="0.1" onChange={(e) => setNewSugarPer100ml(Number(e.target.value))} className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                        </div>
                    </div>

                    {showDateTimePicker && (
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Date</label>
                                <input 
                                    type="date" 
                                    value={selectedDate} 
                                    onChange={(e) => setSelectedDate(e.target.value)} 
                                    className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" 
                                    max={new Date().toISOString().split('T')[0]} // Prevent future dates
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Time</label>
                                <input 
                                    type="time" 
                                    value={selectedTime} 
                                    onChange={(e) => setSelectedTime(e.target.value)} 
                                    className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" 
                                />
                            </div>
                        </div>
                    )}

                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-300 flex items-center justify-center gap-2"><Plus size={20} /> {t('modal_add_button')}</button>
                </form>
            </div>
        </div>
    );
};

const PremiumModal: FC<{ isOpen: boolean; onClose: () => void; onConfirm: () => void; isLoading: boolean; }> = ({ isOpen, onClose, onConfirm, isLoading }) => { // Added isLoading prop
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

// --- Region Switcher Component ---
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


// --- Manage Quick Adds Modal Component (for LumenFuel) ---
interface ManageQuickAddsModalFuelProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string | null;
    db: Firestore | null;
    onQuickAddUpdated: () => void;
}

const ManageQuickAddsModalFuel: FC<ManageQuickAddsModalFuelProps> = ({ isOpen, onClose, userId, db, onQuickAddUpdated }) => {
    const { t } = useTranslation();
    const [customQuickAdds, setCustomQuickAdds] = useState<CustomQuickAddSugar[]>([]);
    const [newLabel, setNewLabel] = useState('');
    const [newType, setNewType] = useState('soda');
    const [newVolume, setNewVolume] = useState(330);
    const [newSugar, setNewSugar] = useState(10.6);
    const [editingId, setEditingId] = useState<string | null>(null);

    useEffect(() => {
        let unsubscribe: (() => void) | undefined;
        if (isOpen && db && userId) {
            const q = query(collection(db, `artifacts/${appId}/users/${userId}/customQuickAddsSugar`));
            unsubscribe = onSnapshot(q, (snapshot) => {
                const fetchedQuickAdds: CustomQuickAddSugar[] = [];
                snapshot.forEach(doc => {
                    fetchedQuickAdds.push({ id: doc.id, ...doc.data() } as CustomQuickAddSugar);
                });
                setCustomQuickAdds(fetchedQuickAdds);
            });
        }
        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [isOpen, db, userId]);

    const handleSaveQuickAdd = async () => {
        if (!db || !userId || !newLabel || !newType || newVolume <= 0 || newSugar <= 0) return;

        const newQuickAddData = {
            label: newLabel,
            type: newType,
            volume: newVolume,
            sugar: newSugar,
        };

        try {
            if (editingId) {
                await setDoc(doc(db, `artifacts/${appId}/users/${userId}/customQuickAddsSugar`, editingId), newQuickAddData);
            } else {
                await addDoc(collection(db, `artifacts/${appId}/users/${userId}/customQuickAddsSugar`), newQuickAddData);
            }
            onQuickAddUpdated();
            setNewLabel('');
            setNewType('soda');
            setNewVolume(330);
            setNewSugar(10.6);
            setEditingId(null);
        } catch (error) {
            console.error("Error saving quick add:", error);
        }
    };

    const handleDeleteQuickAdd = async (id: string) => {
        if (!db || !userId) return;
        try {
            await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/customQuickAddsSugar`, id));
            onQuickAddUpdated();
        } catch (error) {
            console.error("Error deleting quick add:", error);
        }
    };

    const handleEditClick = (quickAdd: CustomQuickAddSugar) => {
        setEditingId(quickAdd.id || null);
        setNewLabel(quickAdd.label);
        setNewType(quickAdd.type);
        setNewVolume(quickAdd.volume);
        setNewSugar(quickAdd.sugar);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-2xl border border-gray-700">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-white">{t('manage_quick_adds')}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={24} /></button>
                </div>

                {/* Add/Edit Form */}
                <div className="bg-gray-700 p-4 rounded-lg mb-6">
                    <h3 className="text-xl font-bold text-white mb-3">{editingId ? t('edit_custom_quick_add') : t('add_custom_quick_add')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">{t('custom_quick_add_label')}</label>
                            <input type="text" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="e.g., My Favorite Soda" className="w-full bg-gray-600 border border-gray-500 rounded-lg p-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">{t('custom_quick_add_type')}</label>
                            <select value={newType} onChange={(e) => setNewType(e.target.value)} className="w-full bg-gray-600 border border-gray-500 rounded-lg p-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none">
                                <option value="soda">{t('drink_soda')}</option>
                                <option value="juice">{t('drink_juice')}</option>
                                <option value="energy_drink">{t('drink_energy_drink')}</option>
                                <option value="sweet_tea">{t('drink_sweet_tea')}</option>
                                <option value="sports_drink">{t('drink_sports_drink')}</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">{t('custom_quick_add_volume')}</label>
                            <input type="number" value={newVolume} onChange={(e) => setNewVolume(Number(e.target.value))} className="w-full bg-gray-600 border border-gray-500 rounded-lg p-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">{t('custom_quick_add_sugar')}</label>
                            <input type="number" value={newSugar} step="0.1" onChange={(e) => setNewSugar(Number(e.target.value))} className="w-full bg-gray-600 border border-gray-500 rounded-lg p-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                        </div>
                    </div>
                    <button onClick={handleSaveQuickAdd} className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2">
                        <Save size={20} /> {t('save_quick_add')}
                    </button>
                </div>

                {/* List of Custom Quick Adds */}
                <h3 className="text-xl font-bold text-white mb-3">Your Custom Quick Adds</h3>
                <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                    {customQuickAdds.length > 0 ? (
                        customQuickAdds.map(qa => (
                            <div key={qa.id} className="flex items-center justify-between bg-gray-700 p-3 rounded-lg">
                                <div>
                                    <p className="font-semibold text-white">{qa.label}</p>
                                    <p className="text-xs text-gray-400">{qa.volume}ml, {qa.sugar}g/100ml sugar ({t(`drink_${qa.type.toLowerCase()}`) || qa.type})</p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleEditClick(qa)} className="text-blue-400 hover:text-blue-300"><Edit size={18} /></button>
                                    <button onClick={() => qa.id && handleDeleteQuickAdd(qa.id)} className="text-red-400 hover:text-red-300"><Trash2 size={18} /></button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-gray-500 py-4">{t('no_custom_quick_adds')}</p>
                    )}
                </div>
            </div>
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

const LongTermAICoach: FC<{ db: Firestore | null; userId: string | null; dailySugarGoal: number | null; }> = ({ db, userId, dailySugarGoal }) => {
    const { t } = useTranslation();
    const [insight, setInsight] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isKeyMissing, setIsKeyMissing] = useState(false);

    const generateLongTermInsight = useCallback(async () => {
        if (!GEMINI_API_KEY) {
            setIsKeyMissing(true);
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

        let goalContext = "";
        if (dailySugarGoal !== null && dailySugarGoal > 0) {
            const totalSugarConsumed = allDrinks.reduce((sum, d) => sum + d.sugarGrams, 0);
            const daysTracked = (new Date().getTime() - new Date(allDrinks[allDrinks.length - 1].timestamp).getTime()) / (1000 * 60 * 60 * 24);
            const avgDailyConsumption = daysTracked > 0 ? totalSugarConsumed / daysTracked : 0;

            if (avgDailyConsumption > dailySugarGoal) {
                goalContext = `On average, they exceed their daily goal of ${dailySugarGoal}g.`;
            } else {
                goalContext = `On average, they are within their daily goal of ${dailySugarGoal}g.`;
            }
        }

        const prompt = `
            As an expert on nutrition, you are an AI Coach for the app LumenFuel.
            A user has logged the following sugary drinks in a session: ${sessionSummary}.
            This amounts to ${totalSugar}g of sugar.
            The current analysis shows a high impact on their energy levels and pancreas.
            ${goalContext}
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
    }, [db, userId, t, dailySugarGoal]);

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


const PremiumDashboard: FC<{ db: Firestore | null; userId: string | null; dailySugarGoal: number | null; }> = ({ db, userId, dailySugarGoal }) => {
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
            <LongTermAICoach db={db} userId={userId} dailySugarGoal={dailySugarGoal} />
        </div>
    );
};

// --- Daily Goal Setting Component (for LumenFuel) ---
interface DailyGoalFuelProps {
    userId: string | null;
    db: Firestore | null;
    dailySugarGoal: number | null;
    setDailySugarGoal: (goal: number | null) => void;
    totalSugarToday: number;
}

const DailyGoalFuel: FC<DailyGoalFuelProps> = ({ userId, db, dailySugarGoal, setDailySugarGoal, totalSugarToday }) => {
    const { t } = useTranslation();
    const [goalInput, setGoalInput] = useState<string>(dailySugarGoal?.toString() || '');
    const [message, setMessage] = useState('');

    useEffect(() => {
        setGoalInput(dailySugarGoal?.toString() || '');
    }, [dailySugarGoal]);

    const handleSetGoal = async () => {
        if (!db || !userId) return;
        const newGoal = parseFloat(goalInput);
        if (isNaN(newGoal) || newGoal <= 0) {
            setMessage("Please enter a valid positive number for your goal.");
            return;
        }
        try {
            await setDoc(doc(db, `artifacts/${appId}/users/${userId}/goals/dailySugar`), { goal: newGoal });
            setDailySugarGoal(newGoal);
            setMessage(t('goal_set_success'));
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            console.error("Error setting goal:", error);
            setMessage("Failed to set goal.");
        }
    };

    const handleDeleteGoal = async () => {
        if (!db || !userId) return;
        try {
            await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/goals/dailySugar`));
            setDailySugarGoal(null);
            setGoalInput('');
            setMessage(t('goal_delete_success'));
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            console.error("Error deleting goal:", error);
            setMessage("Failed to delete goal.");
        }
    };

    const progress = dailySugarGoal ? Math.min((totalSugarToday / dailySugarGoal) * 100, 100) : 0;
    const progressBarColor = progress >= 100 ? 'bg-red-500' : progress > 75 ? 'bg-yellow-500' : 'bg-green-500';

    return (
        <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
            <h3 className="text-xl font-bold text-white mb-4">{t('daily_goal_title')}</h3>
            <div className="flex items-center gap-2 mb-4">
                <input
                    type="number"
                    value={goalInput}
                    onChange={(e) => setGoalInput(e.target.value)}
                    placeholder={t('set_goal') as string}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <button onClick={handleSetGoal} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors">
                    <Save size={20} />
                </button>
                {dailySugarGoal !== null && (
                    <button onClick={handleDeleteGoal} className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg transition-colors">
                        <Trash2 size={20} />
                    </button>
                )}
            </div>
            {message && <p className="text-sm text-center text-green-400 mb-4">{message}</p>}

            <div className="mb-2">
                <p className="text-gray-300 text-sm">{t('current_progress')}: {totalSugarToday.toFixed(1)}g / {dailySugarGoal !== null ? `${dailySugarGoal.toFixed(1)}g` : t('goal_not_set')}</p>
                {dailySugarGoal !== null && dailySugarGoal > 0 && (
                    <div className="w-full bg-gray-700 rounded-full h-2.5 mt-2">
                        <div className={`${progressBarColor} h-2.5 rounded-full`} style={{ width: `${progress}%` }}></div>
                    </div>
                )}
            </div>
            {dailySugarGoal !== null && totalSugarToday <= dailySugarGoal && (
                <p className="text-green-400 text-sm">
                    {(dailySugarGoal - totalSugarToday).toFixed(1)}g {t('goal_remaining')}
                </p>
            )}
            {dailySugarGoal !== null && totalSugarToday > dailySugarGoal && (
                <p className="text-red-400 text-sm font-bold">
                    {t('goal_exceeded')}! (+{(totalSugarToday - dailySugarGoal).toFixed(1)}g)
                </p>
            )}
        </div>
    );
};

// --- Achievements Modal Component (for LumenFuel) ---
interface AchievementsModalFuelProps {
    isOpen: boolean;
    onClose: () => void;
    achievements: Achievement[];
}

const AchievementsModalFuel: FC<AchievementsModalFuelProps> = ({ isOpen, onClose, achievements }) => {
    const { t } = useTranslation();
    if (!isOpen) return null;

    const allAchievements = [
        { id: "first_log", nameKey: "achievement_first_log_name", descriptionKey: "achievement_first_log_desc" },
        { id: "7_day_streak", nameKey: "achievement_7_day_streak_name", descriptionKey: "achievement_7_day_streak_desc" },
        { id: "30_day_streak", nameKey: "achievement_30_day_streak_name", descriptionKey: "achievement_30_day_streak_desc" },
        { id: "5_goal", nameKey: "achievement_5_goal_name", descriptionKey: "achievement_5_goal_desc" },
        { id: "10_drinks", nameKey: "achievement_10_drinks_name", descriptionKey: "achievement_10_drinks_desc" },
        { id: "50_drinks", nameKey: "achievement_50_drinks_name", descriptionKey: "achievement_50_drinks_desc" },
        { id: "100_drinks", nameKey: "achievement_100_drinks_name", descriptionKey: "achievement_100_drinks_desc" },
    ];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-md border border-gray-700">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-white">{t('achievements_title')}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={24} /></button>
                </div>
                <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                    {allAchievements.map(ach => {
                        const earned = achievements.find(e => e.id === ach.id);
                        return (
                            <div key={ach.id} className={`flex items-center gap-4 p-3 rounded-lg ${earned ? 'bg-green-900/30 border border-green-700' : 'bg-gray-700/30 border border-gray-600'}`}>
                                <Award size={36} className={earned ? 'text-yellow-400' : 'text-gray-500'} />
                                <div>
                                    <h4 className="font-bold text-white">{t(ach.nameKey)}</h4>
                                    <p className="text-sm text-gray-300">{t(ach.descriptionKey)}</p>
                                    {earned && <p className="text-xs text-yellow-200 mt-1">Earned: {new Date(earned.earnedDate).toLocaleDateString()}</p>}
                                </div>
                            </div>
                        );
                    })}
                    {achievements.length === 0 && <p className="text-center text-gray-500 py-4">{t('no_achievements_yet')}</p>}
                </div>
            </div>
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
    const [showReminder, setShowReminder] = useState(false); // State for reminder
    const [lastLogTime, setLastLogTime] = useState<number>(Date.now()); // Track last log time
    const [userRegion, setUserRegion] = useState('uk'); // New state for user's region (default to UK)
    const [customQuickAdds, setCustomQuickAdds] = useState<CustomQuickAddSugar[]>([]); // State for custom quick adds
    const [isManageQuickAddsModalOpen, setIsManageQuickAddsModalOpen] = useState(false); // State for custom quick adds modal
    const [dailySugarGoal, setDailySugarGoal] = useState<number | null>(null); // State for daily goal
    const [achievements, setAchievements] = useState<Achievement[]>([]); // State for earned achievements
    const [isAchievementsModalOpen, setIsAchievementsModalOpen] = useState(false); // State for achievements modal
    const [dailyChallenge, setDailyChallenge] = useState<DailyChallenge | null>(null); // State for daily challenge
    const [isLoadingPremium, setIsLoadingPremium] = useState(false);
    const [showLateLogModal, setShowLateLogModal] = useState(false); // New state for late add modal
    const [showDynamicBodyVisual, setShowDynamicBodyVisual] = useState(false); // New state for dynamic body visualizer


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

    // Check for successful payment on component mount
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('success') === 'true') { // Changed from payment_success to success
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

    // Fetch and listen to drinks collection
    useEffect(() => {
        let unsubscribeDrinks: (() => void) | undefined;
        if (db && userId) {
            const drinksCollectionPath = `artifacts/${appId}/users/${userId}/drinks`;
            const q = query(collection(db, drinksCollectionPath));
            unsubscribeDrinks = onSnapshot(q, (querySnapshot) => {
                const drinksData: SugaryDrink[] = [];
                querySnapshot.forEach((doc) => { drinksData.push({ id: doc.id, ...doc.data() } as SugaryDrink); });
                drinksData.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                setDrinks(drinksData);
                setLastLogTime(Date.now()); // Update last log time on any new log
                setShowReminder(false); // Dismiss reminder if new data comes in
                // If there are drinks, enable the dynamic body visual
                if (drinksData.length > 0) {
                    setShowDynamicBodyVisual(true);
                } else {
                    setShowDynamicBodyVisual(false);
                }
            }, (error) => { console.error("Error listening to drinks collection:", error); });
        }
        return () => {
            if (unsubscribeDrinks) {
                unsubscribeDrinks();
            }
        };
    }, [db, userId]);

    const fetchCustomQuickAdds = useCallback(() => {
        let unsubscribeCustomQuickAdds: (() => void) | undefined;
        if (db && userId) {
            const q = query(collection(db, `artifacts/${appId}/users/${userId}/customQuickAddsSugar`));
            unsubscribeCustomQuickAdds = onSnapshot(q, (snapshot) => {
                const fetchedQuickAdds: CustomQuickAddSugar[] = [];
                snapshot.forEach(doc => {
                    fetchedQuickAdds.push({ id: doc.id, ...doc.data() } as CustomQuickAddSugar);
                });
                setCustomQuickAdds(fetchedQuickAdds);
            });
        }
        return () => {
            if (unsubscribeCustomQuickAdds) {
                unsubscribeCustomQuickAdds();
            }
        };
    }, [db, userId]);

    useEffect(() => {
        const unsubscribe = fetchCustomQuickAdds();
        return () => unsubscribe();
    }, [fetchCustomQuickAdds]);

    // Fetch and listen to daily goal
    useEffect(() => {
        let unsubscribeDailyGoal: (() => void) | undefined;
        if (!db || !userId) return;
        const docRef = doc(db, `artifacts/${appId}/users/${userId}/goals/dailySugar`);
        unsubscribeDailyGoal = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                setDailySugarGoal(docSnap.data().goal);
            } else {
                setDailySugarGoal(null);
            }
        }, (error) => {
            console.error("Error fetching daily goal:", error);
        });
        return () => {
            if (unsubscribeDailyGoal) {
                unsubscribeDailyGoal();
            }
        };
    }, [db, userId]);

    // Fetch and listen to achievements
    useEffect(() => {
        let unsubscribeAchievements: (() => void) | undefined;
        if (db && userId) {
            const q = query(collection(db, `artifacts/${appId}/users/${userId}/achievements`));
            unsubscribeAchievements = onSnapshot(q, (snapshot) => {
                const fetchedAchievements: Achievement[] = [];
                snapshot.forEach(doc => {
                    fetchedAchievements.push({ id: doc.id, ...doc.data() } as Achievement);
                });
                setAchievements(fetchedAchievements);
            });
        }
        return () => {
            if (unsubscribeAchievements) {
                unsubscribeAchievements();
            }
        };
    }, [db, userId]);

    // Fetch and manage daily challenge
    useEffect(() => {
        let unsubscribeChallenge: (() => void) | undefined;
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        if (db && userId) {
            const challengeDocRef = doc(db, `artifacts/${appId}/users/${userId}/dailyChallenge/${today}`);
            unsubscribeChallenge = onSnapshot(challengeDocRef, async (docSnap) => {
                if (docSnap.exists()) {
                    setDailyChallenge(docSnap.data() as DailyChallenge);
                } else {
                    // Generate a new challenge if none exists for today
                    const challenges: Omit<DailyChallenge, 'completed'>[] = [
                        { id: 'log_2_drinks', textKey: 'daily_challenge_log_n_drinks', type: 'log_n_drinks', value: 2 },
                        { id: 'stay_below_50g', textKey: 'daily_challenge_stay_below_goal', type: 'stay_below_goal', value: 50 },
                        { id: 'use_custom_quick_add', textKey: 'daily_challenge_use_custom_quick_add', type: 'use_custom_quick_add' },
                    ];
                    const randomChallenge = challenges[Math.floor(Math.random() * challenges.length)];
                    const newChallenge: DailyChallenge = { ...randomChallenge, completed: false };
                    await setDoc(challengeDocRef, newChallenge);
                    setDailyChallenge(newChallenge);
                }
            });
        }
        return () => {
            if (unsubscribeChallenge) {
                unsubscribeChallenge();
            }
        };
    }, [db, userId]);


    useEffect(() => { setAnalysis(analyzeSugarConsumption(drinks, t)); }, [drinks, t]);

    const handleLogDrink = async (drinkData: Omit<SugaryDrink, 'id'>) => {
        if (db && userId) {
            try {
                const drinksCollectionPath = `artifacts/${appId}/users/${userId}/drinks`;
                await addDoc(collection(db, drinksCollectionPath), drinkData);
                setLastLogTime(Date.now()); // Update last log time
                setShowReminder(false); // Dismiss reminder
                checkAchievements(drinks.length + 1, drinkData); // Check achievements after logging
                checkDailyChallengeCompletion(drinks.length + 1, drinkData); // Check daily challenge completion
                if (navigator.vibrate) { // Haptic feedback
                    navigator.vibrate(50);
                }
            } catch (error) { console.error("Error adding drink to Firestore: ", error); }
        }
    };
    
    const handleDeleteDrink = async (drinkId: string) => {
        if (db && userId) {
            try {
                await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/drinks/${drinkId}`));
                // Re-check achievements after deletion if necessary (e.g., if a goal-hitting drink was deleted)
                // For simplicity, we'll just re-evaluate current achievements based on remaining data.
                // A more robust system might re-run checkAchievements on current drinks array.
            } catch (error) { console.error("Error deleting drink:", error); }
        }
    };

    const handleGoPremium = async () => {
        if (!userId) {
            console.error("User ID is not available for premium purchase.");
            alert("Please ensure you are logged in to purchase premium.");
            return;
        }

        setIsLoadingPremium(true);
        try {
            // Updated checkoutApiUrl to your Vercel backend
            const checkoutApiUrl = 'https://stripe-backend-api-xi-seven.vercel.app/api/create-checkout-session'; 
            // Correct Price ID for LumenFuel
            const priceId = 'price_1RoPQ6PEmeNnPDdSW6nyZN5z'; 
            const redirectUrl = window.location.origin; 

            console.log("Sending request to Vercel backend (LumenFuel)...");
            console.log("checkoutApiUrl:", checkoutApiUrl);
            console.log("priceId:", priceId);
            console.log("userId:", userId);
            console.log("redirectUrl:", redirectUrl);

            const response = await fetch(checkoutApiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    priceId: priceId,
                    userId: userId,
                    redirectUrl: redirectUrl,
                }),
            });

            const data = await response.json();
            console.log("Received response from Vercel backend (LumenFuel):", data);
            console.log("Stripe Checkout URL (LumenFuel):", data.url);

            if (response.ok && data.url) {
                window.location.assign(data.url); 
            } else {
                console.error('Error initiating checkout (LumenFuel):', data.message || 'Unknown error', data.details);
                alert(`Failed to start payment: ${data.message || 'Unknown error'}. Please try again.`);
                setIsLoadingPremium(false);
            }
        } catch (error) {
            console.error('Network or unexpected error during checkout initiation (LumenFuel):', error);
            alert('A network error occurred. Please try again.');
            setIsLoadingPremium(false);
        } finally {
            setIsPremiumModalOpen(false); 
        }
    };

    const totalSugar = drinks.reduce((sum, drink) => sum + drink.sugarGrams, 0).toFixed(1);

    // Calculate total sugar consumed today for goal tracking
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const totalSugarToday = drinks.filter(drink => new Date(drink.timestamp).getTime() >= startOfToday.getTime())
                                    .reduce((sum, drink) => sum + drink.sugarGrams, 0);

    // --- Achievement Logic ---
    const checkAchievements = useCallback(async (currentDrinkCount: number, lastLoggedDrink: SugaryDrink) => {
        if (!db || !userId) return;

        const earnedAchievementIds = new Set(achievements.map(a => a.id));
        const addAchievement = async (id: string, nameKey: string, descriptionKey: string) => {
            if (!earnedAchievementIds.has(id)) {
                await addDoc(collection(db, `artifacts/${appId}/users/${userId}/achievements`), {
                    id, nameKey, descriptionKey, earnedDate: new Date().toISOString(),
                });
                confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 }
                });
            }
        };

        // First Taste
        if (currentDrinkCount === 1) {
            addAchievement("first_log", "achievement_first_log_name", "achievement_first_log_desc");
        }

        // Streak Achievements (simplified - a real streak needs daily checks for *all* days)
        const today = new Date();
        today.setHours(0,0,0,0);
        
        if (currentDrinkCount >= 7) addAchievement("7_day_streak", "achievement_7_day_streak_name", "achievement_7_day_streak_desc");
        if (currentDrinkCount >= 30) addAchievement("30_day_streak", "achievement_30_day_streak_name", "achievement_30_day_streak_desc");


        // Goal Setter Novice
        if (dailySugarGoal !== null && totalSugarToday >= dailySugarGoal) {
            const goalHitsRef = doc(db, `artifacts/${appId}/users/${userId}/stats/dailyGoalHitsSugar`);
            const docSnap = await getDoc(goalHitsRef);
            let currentGoalHits = docSnap.exists() ? docSnap.data().count || 0 : 0;
            
            // Prevent multiple hits for the same day
            const lastGoalHitDate = docSnap.exists() ? docSnap.data().lastHitDate : null;
            const todayISO = today.toISOString().split('T')[0];
            if (lastGoalHitDate !== todayISO) { // Only increment if not already hit today
                currentGoalHits++;
                await setDoc(goalHitsRef, { count: currentGoalHits, lastHitDate: todayISO }, { merge: true });

                if (currentGoalHits >= 5) {
                    addAchievement("5_goal", "achievement_5_goal_name", "achievement_5_goal_desc");
                }
            }
        }


        // Total Drinks milestones
        if (currentDrinkCount >= 10) addAchievement("10_drinks", "achievement_10_drinks_name", "achievement_10_drinks_desc");
        if (currentDrinkCount >= 50) addAchievement("50_drinks", "achievement_50_drinks_name", "achievement_50_drinks_desc");
        if (currentDrinkCount >= 100) addAchievement("100_drinks", "achievement_100_drinks_name", "achievement_100_drinks_desc");

    }, [db, userId, achievements, drinks.length, totalSugarToday, dailySugarGoal]);

    // --- Daily Challenge Completion Logic ---
    const checkDailyChallengeCompletion = useCallback(async (currentDrinkCount: number, lastLoggedDrink: SugaryDrink) => {
        if (!db || !userId || !dailyChallenge || dailyChallenge.completed) return;

        const today = new Date().toISOString().split('T')[0];
        const challengeDocRef = doc(db, `artifacts/${appId}/users/${userId}/dailyChallenge/${today}`);
        let challengeCompleted = false;

        switch (dailyChallenge.type) {
            case 'log_n_drinks':
                const todayDrinks = drinks.filter(d => new Date(d.timestamp).toISOString().split('T')[0] === today).length;
                if (todayDrinks >= (dailyChallenge.value || 0)) {
                    challengeCompleted = true;
                }
                break;
            case 'stay_below_goal':
                if (dailySugarGoal !== null && totalSugarToday <= (dailyChallenge.value || dailySugarGoal)) {
                    challengeCompleted = true;
                }
                break;
            case 'use_custom_quick_add':
                // Check if the last logged drink was from a custom quick add
                const customAddUsed = customQuickAdds.some(qa => qa.type === lastLoggedDrink.type && qa.volume === lastLoggedDrink.volume && qa.sugar === lastLoggedDrink.sugar);
                if (customAddUsed) {
                    challengeCompleted = true;
                }
                break;
        }

        if (challengeCompleted) {
            await setDoc(challengeDocRef, { ...dailyChallenge, completed: true }, { merge: true });
            setDailyChallenge(prev => prev ? { ...prev, completed: true } : null);
            confetti({
                particleCount: 150,
                spread: 90,
                origin: { y: 0.8 }
            });
        }
    }, [db, userId, dailyChallenge, drinks, dailySugarGoal, totalSugarToday, customQuickAdds]);


    // --- Reminder Logic ---
    useEffect(() => {
        const REMINDER_INTERVAL_MINUTES = 15; // Remind every 15 minutes if no activity
        let reminderTimer: NodeJS.Timeout;

        const checkAndShowReminder = () => {
            const timeElapsed = (Date.now() - lastLogTime) / (1000 * 60); // minutes
            if (timeElapsed >= REMINDER_INTERVAL_MINUTES && !isModalOpen && !isAchievementsModalOpen && !isManageQuickAddsModalOpen && !isPremiumModalOpen) {
                setShowReminder(true);
            }
        };

        // Set up an interval to check for reminders
        reminderTimer = setInterval(checkAndShowReminder, REMINDER_INTERVAL_MINUTES * 60 * 1000);

        return () => clearInterval(reminderTimer); // Cleanup on unmount
    }, [lastLogTime, isModalOpen, isAchievementsModalOpen, isManageQuickAddsModalOpen, isPremiumModalOpen]);

    // --- Share Progress Logic ---
    const handleShareProgress = useCallback(async () => {
        let shareMessage = "";
        if (dailySugarGoal !== null && dailySugarGoal > 0) {
            if (totalSugarToday > dailySugarGoal) {
                shareMessage = t('share_message_over_goal', { grams: totalSugarToday.toFixed(1), goal: dailySugarGoal.toFixed(1) });
            } else {
                shareMessage = t('share_message_goal', { grams: totalSugarToday.toFixed(1), goal: dailySugarGoal.toFixed(1) });
            }
        } else {
            shareMessage = t('share_message_no_goal', { grams: totalSugarToday.toFixed(1) });
        }

        if (navigator.share) {
            try {
                await navigator.share({
                    title: t('app_title') as string,
                    text: shareMessage,
                    url: window.location.href, // Share the current app URL
                });
                console.log('Successfully shared');
            } catch (error) {
                console.error('Error sharing:', error);
                // Fallback for when share fails or is cancelled
                alert('Could not share. You can copy the text: ' + shareMessage);
            }
        } else {
            // Fallback for browsers that do not support Web Share API
            const tempTextArea = document.createElement('textarea');
            tempTextArea.value = shareMessage;
            document.body.appendChild(tempTextArea);
            tempTextArea.select();
            document.execCommand('copy');
            document.body.removeChild(tempTextArea);
            alert('Web Share API not supported. Text copied to clipboard: ' + shareMessage);
        }
    }, [dailySugarGoal, totalSugarToday, t]); // Added dependencies for useCallback


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

    // Get current region's drink presets for Quick Add buttons
    const currentRegionPresets = globalSugaryDrinkPresets[userRegion] || globalSugaryDrinkPresets['uk'];
    const quickAddTypes = ['soda', 'juice', 'energy_drink', 'sweet_tea', 'sports_drink'];


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
                     @keyframes bounce-subtle {
                        0%, 100% { transform: translateY(0) translateX(-50%); }
                        50% { transform: translateY(-5px) translateX(-50%); }
                    }
                `}
            </style>
            <DrinkModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onLogDrink={handleLogDrink} currentRegion={userRegion} />
            {/* New Late Log Modal for LumenFuel */}
            <DrinkModal isOpen={showLateLogModal} onClose={() => setShowLateLogModal(false)} onLogDrink={handleLogDrink} currentRegion={userRegion} showDateTimePicker={true} />
            <ManageQuickAddsModalFuel
                isOpen={isManageQuickAddsModalOpen}
                onClose={() => setIsManageQuickAddsModalOpen(false)}
                userId={userId}
                db={db}
                onQuickAddUpdated={fetchCustomQuickAdds}
            />
            <AchievementsModalFuel
                isOpen={isAchievementsModalOpen}
                onClose={() => setIsAchievementsModalOpen(false)}
                achievements={achievements}
            />
            {/* Updated PremiumModal to use isLoadingPremium prop */}
            <PremiumModal 
                isOpen={isPremiumModalOpen} 
                onClose={() => setIsPremiumModalOpen(false)} 
                onConfirm={handleGoPremium} 
                isLoading={isLoadingPremium} // Pass isLoadingPremium to the modal
            />

            <header className="p-4 border-b border-gray-800 flex justify-between items-center sticky top-0 bg-gray-900/80 backdrop-blur-md z-40">
                <div className="flex items-center gap-3"><Zap className="text-yellow-400" size={32} /><h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-yellow-400 to-orange-500 text-transparent bg-clip-text">{t('app_title')}</h1></div>
                <div className="flex items-center gap-4">
                    <RegionSwitcherFuel currentRegion={userRegion} setRegion={setUserRegion} /> {/* Region Switcher for Fuel App */}
                    <LanguageSwitcher />
                    <button onClick={handleGoPremium} className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold py-2 px-4 rounded-lg transition-transform hover:scale-105 shadow-lg shadow-yellow-500/20">
                        {t('header_premium_button')}
                    </button>
                </div>
            </header>
            <main className="p-4 md:p-8">
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-8">
                    <div className="lg:col-span-3 bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
                        <div className="flex justify-between items-start mb-4"><div><h2 className="text-3xl font-bold text-white">{t('section_title_impact')}</h2><p className="text-gray-400">{t('section_subtitle_impact')}</p></div><div className="text-right flex-shrink-0 ml-4"><p className="text-gray-400 text-sm">{t('label_total_sugar')}</p><p className="text-2xl font-bold text-yellow-400">{totalSugar}g</p></div></div>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-center">
                            <div className="md:col-span-3">
                                {/* Conditional rendering for static vs. dynamic visual */}
                                {drinks.length > 0 ? (
                                    <BodyVisual analysis={analysis} drinkCount={drinks.length} />
                                ) : (
                                    <div className="relative w-full mx-auto aspect-square flex items-center justify-center overflow-hidden">
                                        {/* Background grid */}
                                        <svg viewBox="0 0 300 300" className="w-full h-full absolute inset-0">
                                            <defs>
                                                <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                                                    <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(107, 114, 128, 0.1)" strokeWidth="1"/>
                                                </pattern>
                                            </defs>
                                            <rect width="300" height="300" fill="url(#grid)" />
                                        </svg>
                                        {/* Static LumenFuel Zap icon as placeholder */}
                                        <Zap size={150} className="text-yellow-400/50 relative z-10" />
                                    </div>
                                )}
                            </div>
                            <div className="space-y-3 md:col-span-2">
                                {analysis && Object.values(analysis).map(region => (<div key={region.name} className="bg-gray-800 p-3 rounded-lg transition-all hover:bg-gray-700/50"><div className="flex justify-between items-center"><span className="font-semibold">{t(region.name)}</span><span className={`font-bold text-sm ${region.impactColor}`}>{region.impactWord}</span></div><p className="text-xs text-gray-400 mt-1">{region.effectText}</p></div>))}
                            </div>
                        </div>
                        <AICoach drinks={drinks} analysis={analysis} dailySugarGoal={dailySugarGoal} />
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
                                    {/* New button for Late Adds */}
                                    <button onClick={() => setShowLateLogModal(true)} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-300 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20">
                                        <History size={20} /> {t('log_late_drink')}
                                    </button>
                                </div>
                                {/* Quick Log Buttons */}
                                <div className="mt-6">
                                    <div className="flex justify-between items-center mb-3">
                                        <h4 className="text-lg font-bold text-white">{t('quick_log_title')}</h4>
                                        <button onClick={() => setIsManageQuickAddsModalOpen(true)} className="text-gray-400 hover:text-white flex items-center gap-1 text-sm">
                                            <Settings size={16} /> Manage
                                        </button>
                                        <button onClick={() => setIsAchievementsModalOpen(true)} className="text-yellow-400 hover:text-yellow-300 flex items-center gap-1 text-sm ml-auto">
                                            <Award size={16} /> {t('achievements_title')}
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        {quickAddTypes.map(type => {
                                            const preset = currentRegionPresets[type];
                                            if (!preset) return null;
                                            return (
                                                <button
                                                    key={type}
                                                    onClick={() => handleLogDrink({ type: type, volume: preset.volume, sugarGrams: (preset.volume * preset.sugar / 100), timestamp: new Date().toISOString() })}
                                                    className="bg-gray-700 hover:bg-gray-600 text-white text-sm py-2 px-3 rounded-lg transition-colors"
                                                >
                                                    {t(preset.translationKey)}
                                                </button>
                                            );
                                        })}
                                        {/* Custom quick adds */}
                                        {customQuickAdds.length > 0 ? (
                                            customQuickAdds.map(qa => (
                                                <button
                                                    key={qa.id}
                                                    onClick={() => handleLogDrink({ type: qa.type, volume: qa.volume, sugarGrams: (qa.volume * qa.sugar / 100), timestamp: new Date().toISOString() })}
                                                    className="bg-purple-700 hover:bg-purple-600 text-white text-sm py-2 px-3 rounded-lg transition-colors"
                                                >
                                                    {qa.label}
                                                </button>
                                            ))
                                        ) : (
                                            <p className="col-span-3 text-center text-gray-500 py-4">{t('no_custom_quick_adds')}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-6 p-4 bg-yellow-900/30 border border-yellow-700 rounded-lg flex items-start gap-3">
                                    <Info size={20} className="text-yellow-400 mt-1 flex-shrink-0" />
                                    <div>
                                        <h4 className="font-bold text-yellow-300">{t('disclaimer_title')}</h4>
                                        <p className="text-xs text-yellow-300/80">{t('disclaimer_text')}</p>
                                    </div>
                                </div>
                            </div>
                            <DailyGoalFuel userId={userId} db={db} dailySugarGoal={dailySugarGoal} setDailySugarGoal={setDailySugarGoal} totalSugarToday={totalSugarToday} />
                            <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
                                <h3 className="text-xl font-bold mb-4">{t('section_title_log')}</h3>
                                <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                                    {drinks.length > 0 ? drinks.map(drink => (
                                        <div key={drink.id || ''} className="group flex items-center justify-between bg-gray-800 p-3 rounded-lg hover:bg-gray-700/50">
                                            <div className="flex items-center gap-3">
                                                <Droplet className="text-blue-400" size={18} />
                                                <div>
                                                    <p className="font-semibold capitalize">{t(`drink_${drink.type.toLowerCase()}`) || drink.type}</p>
                                                    <p className="text-xs text-gray-400">{drink.volume}ml / {drink.sugarGrams.toFixed(1)}g sugar</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <button onClick={() => drink.id && handleDeleteDrink(drink.id)} className="text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    )) : <p className="text-center text-gray-500 py-8">{t('log_empty')}</p>}
                                </div>
                            </div>
                            <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="flex items-center">
                                        <Star className="text-yellow-400" /><h3 className="text-xl font-bold ml-2">{t('section_title_premium')}</h3>
                                    </div>
                                    <button onClick={handleShareProgress} className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1 rounded-lg transition-colors flex items-center gap-1">
                                        <Share2 size={16} /> {t('share_progress_button')}
                                    </button>
                                </div>
                                <div className="space-y-4">
                                    <PremiumFeature title={t('premium_feature_trends_title') as string} description={t('premium_feature_trends_desc') as string} icon={<BarChart3 className="text-gray-400" />} onUpgrade={handleGoPremium} />
                                    <PremiumFeature title={t('premium_feature_insights_title') as string} description={t('premium_feature_insights_desc') as string} icon={<TrendingUp className="text-gray-400" />} onUpgrade={handleGoPremium} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
            {showReminder && (
                <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-blue-800 p-4 rounded-lg shadow-xl flex items-center gap-4 z-50 animate-bounce-subtle">
                    <BellRing className="text-blue-200" size={24} />
                    <div>
                        <h4 className="font-bold text-white">{t('reminder_title')}</h4>
                        <p className="text-sm text-blue-100">{t('reminder_text')}</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => { setIsModalOpen(true); setShowReminder(false); }} className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1 rounded-md">
                            {t('reminder_log_button')}
                        </button>
                        <button onClick={() => setShowReminder(false)} className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-3 py-1 rounded-md">
                            {t('reminder_dismiss_button')}
                        </button>
                    </div>
                </div>
            )}
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
