Fashion Recommendation & Outfit Matching System
An AI-powered backend that recommends clothing colors based on a user's physical attributes (skin tone, eye color, hair color) and predicts the best matching "bottom-wear" using an XGBoost Classifier. The system also serves actual product images from a fashion dataset based on these recommendations.

🚀 Features
Personalized Color Analysis: Maps complex physical attributes (Hair, Eye, Skin, Undertone) to ideal clothing color palettes using a rule-based engine.

AI Outfit Matching: Uses an XGBoost model to predict the most aesthetically pleasing pants/bottom colors based on the recommended top color, height, weight, and BMI.

Visual Recommendations: Fetches and encodes real product images (Base64) from the Fashion Product Images dataset, filtered by gender and season.

Dynamic BMI Integration: Factors in body metrics to refine clothing predictions.

📊 Datasets Used
This project integrates three high-quality datasets from Kaggle:

Body Metrics & Fashion Colors: Used to train the XGBoost model for matching tops and bottoms.

Fashion & Color Recommendation: Provides the rule-based mapping for skin/eye/hair color matching.

Fashion Product Images (Small): Used for serving product metadata and images.

🛠️ Tech Stack
Framework: FastAPI

Machine Learning: XGBoost, Scikit-learn (Label Encoding, Train-Test Split)

Data Handling: Pandas, NumPy

Image Processing: Pillow (PIL)

Server: Uvicorn

⚙️ Installation & Setup
1. Clone the Repository
Bash
git clone https://github.com/your-username/fashion-recommendation-api.git
cd fashion-recommendation-api
2. Install Dependencies
Bash
pip install fastapi uvicorn pandas numpy xgboost scikit-learn pillow pydantic
3. Configure Paths
Open api.py and update the local paths to point to your downloaded Kaggle datasets:

Python
RECOMMENDATIONS_CSV = r"C:\...\recommendations.csv"
BODY_METRICS_CSV    = r"C:\...\Profile of Body Metrics and Fashion Colors.csv"
STYLES_CSV          = r"C:\...\styles.csv"
IMAGE_DIR           = r"C:\...\images"
4. Run the API
Bash
uvicorn api:app --reload
🛣️ API Endpoints
1. POST /recommend
Analyzes user metrics and returns recommended color palettes and predicted outfit pairs.

Request Body:

JSON
{
  "hair_color": "Black",
  "eye_color": "Brown",
  "skin_tone": "Fair",
  "under_tone": "Warm",
  "torso_length": "Average",
  "body_proportion": "Balanced",
  "height": 175.0,
  "weight": 70.0,
  "gender": "Men",
  "bmi_label": "Normal"
}
2. POST /images
Fetches Base64 encoded images for specific top and bottom colors.

Request Body:

JSON
{
  "gender": "Men",
  "top_color": "Blue",
  "bottom_color": "Black",
  "season": "Summer",
  "n": 4
}
3. GET /health
Returns the status of the API and confirms if the ML model is trained and ready.

🧠 Logic Flow
Startup: The API loads all CSVs into memory and trains an XGBClassifier on the Body Metrics dataset to learn color coordination patterns.

Color Bridge: A custom mapping handles the "translation" between abstract color names (e.g., "Jewel Tones") and standard CSS/Fashion colors (e.g., "Teal", "Magenta").

Image Processing: Images are resized to thumbnails and converted to Base64 strings for easy integration with frontend frameworks like React or Flutter.
