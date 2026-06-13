export const THEME_STORAGE_KEY = "medical-report-theme";
export const ORDER_STORAGE_KEY = "lab-order-portal-orders";
export const LOGIN_STORAGE_KEY = "lab-order-portal-user";
export const VALID_SECTIONS = new Set(["home", "login", "about", "catalogue", "order", "history"]);
export const SUPPORTED_EXTENSIONS = new Set(["pdf", "docx", "txt"]);

export const measurementRules = [
  {
    id: "fasting_glucose",
    name: "Fasting Glucose",
    aliases: ["fasting blood sugar", "fasting glucose", "glucose fasting"],
    unit: "mg/dL",
    min: 70,
    max: 99,
    refRange: "70 - 99 mg/dL",
    category: "metabolic",
    severity: "high",
    issueTitle: "Elevated Blood Sugar Risk",
    improve: "Control high glycemic foods and follow regular meal timing.",
    foods: "Oats, lentils, leafy vegetables, nuts, cinnamon.",
    avoid: "Sugary drinks, sweets, white flour snacks."
  },
  {
    id: "hba1c",
    name: "HbA1c",
    aliases: ["hba1c", "glycated hemoglobin"],
    unit: "%",
    min: 4,
    max: 5.6,
    refRange: "4.0 - 5.6 %",
    category: "metabolic",
    severity: "high",
    issueTitle: "Long-Term Glucose Control Concern",
    improve: "Maintain consistent carbohydrate intake and activity routine.",
    foods: "Millets, legumes, vegetables, seeds, curd.",
    avoid: "Refined sugar and frequent high-carb processed meals."
  },
  {
    id: "ldl",
    name: "LDL Cholesterol",
    aliases: ["ldl", "ldl cholesterol"],
    unit: "mg/dL",
    min: 0,
    max: 100,
    refRange: "< 100 mg/dL",
    category: "cardio",
    severity: "moderate",
    issueTitle: "Higher LDL Cholesterol",
    improve: "Increase soluble fiber and healthy fats to support lipid balance.",
    foods: "Oats, flax seeds, walnuts, fish, beans.",
    avoid: "Deep-fried items, trans fats, processed meats."
  },
  {
    id: "triglycerides",
    name: "Triglycerides",
    aliases: ["triglycerides", "triglyceride"],
    unit: "mg/dL",
    min: 0,
    max: 150,
    refRange: "< 150 mg/dL",
    category: "cardio",
    severity: "moderate",
    issueTitle: "Higher Triglycerides",
    improve: "Reduce sugar load and improve daily movement.",
    foods: "Vegetables, whole grains, omega-3 rich seeds.",
    avoid: "Alcohol excess, sugary juices, packaged desserts."
  },
  {
    id: "hdl",
    name: "HDL Cholesterol",
    aliases: ["hdl", "hdl cholesterol"],
    unit: "mg/dL",
    min: 40,
    max: 999,
    refRange: ">= 40 mg/dL",
    category: "cardio",
    severity: "moderate",
    issueTitle: "Lower Protective HDL",
    improve: "Support HDL with exercise and better fat quality.",
    foods: "Groundnuts, olive oil, fish, avocado.",
    avoid: "Sedentary routine and trans-fat snacks."
  },
  {
    id: "hemoglobin",
    name: "Hemoglobin",
    aliases: ["hemoglobin", "hb"],
    unit: "g/dL",
    min: 12,
    max: 17,
    refRange: "12 - 17 g/dL",
    category: "blood",
    severity: "moderate",
    issueTitle: "Possible Low Hemoglobin",
    improve: "Focus on iron-rich meals with vitamin C support.",
    foods: "Spinach, beetroot, lentils, dates, citrus fruits.",
    avoid: "Tea or coffee immediately after iron-rich meals."
  },
  {
    id: "vitamin_d",
    name: "Vitamin D",
    aliases: ["vitamin d", "25-oh vitamin d", "25 hydroxy vitamin d"],
    unit: "ng/mL",
    min: 30,
    max: 100,
    refRange: "30 - 100 ng/mL",
    category: "nutrition",
    severity: "low",
    issueTitle: "Vitamin D Deficiency Risk",
    improve: "Improve sunlight exposure and include vitamin D rich foods.",
    foods: "Egg yolk, mushrooms, fatty fish, fortified milk.",
    avoid: "Long indoor-only routine and poor sleep cycle."
  },
  {
    id: "uric_acid",
    name: "Uric Acid",
    aliases: ["uric acid"],
    unit: "mg/dL",
    min: 3,
    max: 7,
    refRange: "3 - 7 mg/dL",
    category: "metabolic",
    severity: "low",
    issueTitle: "Elevated Uric Acid",
    improve: "Increase hydration and moderate high-purine foods.",
    foods: "Water-rich fruits, whole grains, low-fat dairy.",
    avoid: "Organ meats, heavy red meat, sweetened beverages."
  },
  {
    id: "systolic_bp",
    name: "Systolic BP",
    aliases: ["systolic", "blood pressure", "bp"],
    unit: "mmHg",
    min: 90,
    max: 120,
    refRange: "90 - 120 mmHg",
    category: "cardio",
    severity: "moderate",
    issueTitle: "Blood Pressure Elevation",
    improve: "Follow low-sodium diet with stress and sleep management.",
    foods: "Banana, beetroot, spinach, yogurt, pumpkin seeds.",
    avoid: "High-salt packaged food and repeated late-night meals."
  }
];

export const keywordRiskRules = [
  {
    id: "thyroid",
    name: "Thyroid Imbalance Mentioned",
    severity: "low",
    weight: 8,
    keywords: ["thyroid", "tsh", "t3", "t4"],
    improve: "Ensure thyroid monitoring and maintain iodine-balanced diet.",
    foods: "Iodized salt (in moderation), eggs, dairy, lentils.",
    avoid: "Unmonitored supplements and highly processed foods."
  },
  {
    id: "fatty_liver",
    name: "Fatty Liver Marker Mentioned",
    severity: "moderate",
    weight: 11,
    keywords: ["fatty liver", "sgpt", "alt", "ast"],
    improve: "Limit sugar and fat load while improving activity levels.",
    foods: "Leafy greens, whole grains, berries, nuts.",
    avoid: "Alcohol, deep fried foods, excess fructose drinks."
  }
];

export const demoReportText = `
Patient report summary:
Fasting Blood Sugar: 142 mg/dL
HbA1c: 7.1 %
LDL Cholesterol: 164 mg/dL
Triglycerides: 198 mg/dL
HDL: 34 mg/dL
Hemoglobin: 10.8 g/dL
Vitamin D: 18 ng/mL
Uric Acid: 7.8 mg/dL
Blood Pressure: 148 / 96 mmHg
`;
