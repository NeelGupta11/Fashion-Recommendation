# api.py
# Run with: uvicorn api:app --reload

import os, ast, base64, io
import numpy as np
import pandas as pd
from PIL import Image
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier

app = FastAPI(title="Fashion Recommendation API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],      # tighten this in production
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────
# CONFIG — update these paths
# ─────────────────────────────────────────────
RECOMMENDATIONS_CSV = r"C:\Users\Neelg\OneDrive\Desktop\FashionRecommendation\recommendations.csv"
BODY_METRICS_CSV    = r"C:\Users\Neelg\OneDrive\Desktop\FashionRecommendation\Profile of Body Metrics and Fashion Colors.csv"
STYLES_CSV          = r"C:\Users\Neelg\OneDrive\Desktop\FashionRecommendation\styles.csv"
IMAGE_DIR           = r"C:\Users\Neelg\OneDrive\Desktop\FashionRecommendation\images"

# ─────────────────────────────────────────────
# STARTUP — load data + train model once
# ─────────────────────────────────────────────
rule_map    = {}
le_cloth    = LabelEncoder()
le_pants    = LabelEncoder()
le_gender   = LabelEncoder()
le_bmi      = LabelEncoder()
model_pants = None
styles_df   = None

SKIN_MAP = {
    "very fair": "light", "fair": "mid-light",
    "medium": "mid-dark", "olive": "mid-dark",
    "brown": "dark", "very dark": "dark",
    "light": "light", "mid-light": "mid-light",
    "mid-dark": "mid-dark", "dark": "dark",
}

COLOR_BRIDGE = {
    "Earth Tones": ["brown","khaki","coffee brown","tan","beige","mushroom brown","taupe"],
    "Olive":       ["olive"],
    "Coral":       ["peach","rust","orange"],
    "Peach":       ["peach","cream","nude"],
    "Mustard":     ["mustard","yellow"],
    "Warm Red":    ["red","maroon","rust","burgundy"],
    "Jewel Tones": ["purple","teal","sea green","magenta"],
    "Icy Blue":    ["blue","navy blue","turquoise blue"],
    "Lavender":    ["lavender","mauve","rose"],
    "Silver":      ["silver","grey","grey melange","charcoal","steel"],
    "Emerald":     ["green","sea green","teal"],
    "Teal":        ["teal","sea green"],
    "Soft Pinks":  ["pink","peach","rose","mauve"],
    "Plums":       ["purple","maroon","burgundy","magenta"],
    "Neutral Beige":["beige","cream","nude","off white","skin"],
    "Cool Blue":   ["blue","navy blue","teal","turquoise blue"],
    "Icy Gray":    ["grey","grey melange","charcoal","silver","steel"],
    "red":    ["red","maroon","rust","burgundy"],
    "blue":   ["blue","navy blue","turquoise blue","teal"],
    "green":  ["green","sea green","olive","lime green"],
    "yellow": ["yellow","mustard"],
    "orange": ["orange","rust","peach"],
    "purple": ["purple","lavender","mauve","magenta"],
    "brown":  ["brown","coffee brown","khaki","tan","beige","taupe"],
    "black":  ["black"],
    "white":  ["white","off white","cream"],
    "grey":   ["grey","grey melange","charcoal","silver","steel"],
    "pink":   ["pink","rose","peach","mauve"],
}

NB1_TO_SIMPLE = {
    "Earth Tones":"brown","Olive":"green","Coral":"orange","Peach":"pink",
    "Mustard":"yellow","Warm Red":"red","Jewel Tones":"purple",
    "Icy Blue":"blue","Lavender":"purple","Silver":"grey","Emerald":"green",
    "Teal":"blue","Soft Pinks":"pink","Plums":"purple","Neutral Beige":"brown",
    "Cool Blue":"blue","Icy Gray":"grey","Fluorescents":"other","Harsh Yellow":"yellow",
}

def simplify_color(rgb):
    r, g, b = rgb
    if r>150 and g<100 and b<100:          return "red"
    elif b>150 and r<120:                  return "blue"
    elif g>150 and r<120:                  return "green"
    elif r>180 and g>180 and b<120:        return "yellow"
    elif r>180 and 100<g<180 and b<100:    return "orange"
    elif r>120 and b>120 and g<100:        return "purple"
    elif r>100 and g<100 and b<80:         return "brown"
    elif r<60 and g<60 and b<60:           return "black"
    elif r>200 and g>200 and b>200:        return "white"
    elif abs(r-g)<20 and abs(g-b)<20:      return "grey"
    elif r>180 and g<120 and b>120:        return "pink"
    else:                                  return "other"

def safe_transform(le, value, fallback=0):
    return le.transform([value])[0] if value in le.classes_ else fallback

@app.on_event("startup")
def startup():
    global rule_map, model_pants, styles_df

    # ── Notebook 1: rule map ──────────────────
    df1 = pd.read_csv(RECOMMENDATIONS_CSV)
    df1["Skin Tone"] = df1["Skin Tone"].str.strip().str.lower().map(SKIN_MAP)
    df1["Recommended Clothing Colors"] = df1["Recommended Clothing Colors"].apply(
        lambda x: [i.strip() for i in x.split(",")]
    )
    df1["Avoid Clothing Colors"] = df1["Avoid Clothing Colors"].apply(
        lambda x: [i.strip() for i in x.split(",")]
    )
    for _, row in df1.iterrows():
        key = (row["Hair Color"], row["Eye Color"], row["Skin Tone"],
               row["Under Tone"], row["Torso length"], row["Body Proportion"])
        rule_map[key] = (row["Recommended Clothing Colors"], row["Avoid Clothing Colors"])

    # ── Notebook 1: XGBoost pants model ──────
    df2 = pd.read_csv(BODY_METRICS_CSV, sep=";")
    df2["Clothes RGB"] = df2["Clothes Color"].apply(ast.literal_eval)
    df2["Pants RGB"]   = df2["Pants Color"].apply(ast.literal_eval)
    df2["Clothes Label"] = df2["Clothes RGB"].apply(simplify_color)
    df2["Pants Label"]   = df2["Pants RGB"].apply(simplify_color)
    df2["cloth_enc"]  = le_cloth.fit_transform(df2["Clothes Label"])
    df2["pants_enc"]  = le_pants.fit_transform(df2["Pants Label"])
    df2["gender_enc"] = le_gender.fit_transform(df2["Gender"])
    df2["bmi_enc"]    = le_bmi.fit_transform(df2["BMI"])
    df2["hw_ratio"]   = df2["Height(Centimeter)"] / df2["Weight(Kilograms)"]
    df2["color_group"]      = df2["cloth_enc"] % 3
    df2["bmi_cloth_int"]    = df2["bmi_enc"] * df2["cloth_enc"]
    df2["gender_cloth_int"] = df2["gender_enc"] * df2["cloth_enc"]

    FEATURES = ["cloth_enc","Height(Centimeter)","Weight(Kilograms)",
                "hw_ratio","color_group","gender_enc","bmi_enc",
                "bmi_cloth_int","gender_cloth_int"]
    X2 = df2[FEATURES]
    y2 = df2["pants_enc"]
    X_train, X_test, y_train, y_test = train_test_split(
        X2, y2, test_size=0.2, random_state=42, stratify=y2
    )
    model_pants = XGBClassifier(
        n_estimators=1000, max_depth=4, learning_rate=0.05,
        subsample=0.7, colsample_bytree=0.7, min_child_weight=5,
        gamma=0.3, reg_alpha=0.1, reg_lambda=2.0,
        eval_metric="mlogloss", early_stopping_rounds=30, random_state=42
    )
    model_pants.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=False)

    # ── Notebook 2: styles dataframe ─────────
    styles_df = pd.read_csv(STYLES_CSV, on_bad_lines="skip")
    styles_df["baseColour"] = styles_df["baseColour"].astype(str).str.lower().str.strip()
    styles_df["gender"]      = styles_df["gender"].astype(str).str.strip()
    styles_df["season"]      = styles_df["season"].astype(str).str.strip()
    styles_df["subCategory"] = styles_df["subCategory"].astype(str).str.strip()

    print("Startup complete — model trained, data loaded.")

# ─────────────────────────────────────────────
# REQUEST / RESPONSE MODELS
# ─────────────────────────────────────────────
class RecommendRequest(BaseModel):
    hair_color:      str
    eye_color:       str
    skin_tone:       str       # raw input, e.g. "fair"
    under_tone:      str
    torso_length:    str
    body_proportion: str
    height:          float
    weight:          float
    gender:          str
    bmi_label:       str

class ImagesRequest(BaseModel):
    gender:       str
    top_color:    str           # color name from /recommend output
    bottom_color: str
    season:       str | None = None
    n:            int = 4

# ─────────────────────────────────────────────
# ROUTE 1 — /recommend
# ─────────────────────────────────────────────
def predict_user(user_dict):
    key = (
        user_dict["Hair Color"], user_dict["Eye Color"], user_dict["Skin Tone"],
        user_dict["Under Tone"], user_dict["Torso length"], user_dict["Body Proportion"]
    )
    if key in rule_map:
        return rule_map[key]
    for k, v in rule_map.items():
        if k[3] == key[3] and k[5] == key[5]:
            return v
    return (["Neutral Beige"], ["Black"])

@app.post("/recommend")
def recommend(req: RecommendRequest):
    skin = SKIN_MAP.get(req.skin_tone.strip().lower(), "mid-dark")
    user = {
        "Hair Color": req.hair_color.strip().title(),
        "Eye Color":  req.eye_color.strip().title(),
        "Skin Tone":  skin,
        "Under Tone": req.under_tone.strip().title(),
        "Torso length":    req.torso_length.strip().title(),
        "Body Proportion": req.body_proportion.strip().title(),
    }
    rec_colors, avoid_colors = predict_user(user)

    # Map to simple labels for XGBoost
    mapped = list({NB1_TO_SIMPLE.get(c, c.lower()) for c in rec_colors
                   if NB1_TO_SIMPLE.get(c, c.lower()) != "other"})

    gender_enc = safe_transform(le_gender, req.gender.strip().title())
    bmi_enc    = safe_transform(le_bmi,    req.bmi_label.strip().title())
    hw_ratio   = req.height / req.weight

    outfit_pairs = []
    for cloth in mapped:
        if cloth not in le_cloth.classes_:
            continue
        cloth_enc        = le_cloth.transform([cloth])[0]
        color_group      = cloth_enc % 3
        bmi_cloth_int    = bmi_enc * cloth_enc
        gender_cloth_int = gender_enc * cloth_enc
        inp = np.array([[cloth_enc, req.height, req.weight, hw_ratio,
                         color_group, gender_enc, bmi_enc,
                         bmi_cloth_int, gender_cloth_int]])
        probs    = model_pants.predict_proba(inp)[0]
        top_idx  = np.argsort(probs)[-3:][::-1]
        for idx in top_idx:
            pants = le_pants.inverse_transform([idx])[0]
            if pants != "other":
                outfit_pairs.append({"top": cloth, "bottom": pants})

    # Deduplicate
    seen = set()
    unique_pairs = []
    for p in outfit_pairs:
        k = (p["top"], p["bottom"])
        if k not in seen:
            seen.add(k)
            unique_pairs.append(p)

    return {
        "recommended_colors": rec_colors,
        "avoid_colors":        avoid_colors,
        "outfit_pairs":        unique_pairs,
    }

# ─────────────────────────────────────────────
# ROUTE 2 — /images
# ─────────────────────────────────────────────
def img_to_b64(path):
    img = Image.open(path).convert("RGB")
    img.thumbnail((300, 400))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return base64.b64encode(buf.getvalue()).decode()

@app.post("/images")
def get_images(req: ImagesRequest):
    top_kws    = COLOR_BRIDGE.get(req.top_color,    [req.top_color.lower()])
    bottom_kws = COLOR_BRIDGE.get(req.bottom_color, [req.bottom_color.lower()])

    df = styles_df[styles_df["gender"] == req.gender.strip().title()].copy()
    valid_seasons = {"Fall","Summer","Winter","Spring"}
    if req.season and req.season.strip().title() in valid_seasons:
        df = df[df["season"] == req.season.strip().title()]

    top_df    = df[(df["subCategory"]=="Topwear")    & (df["baseColour"].isin(top_kws))]
    bottom_df = df[(df["subCategory"]=="Bottomwear") & (df["baseColour"].isin(bottom_kws))]

    def sample_with_images(section_df, n):
        results = []
        for img_id in section_df["id"].sample(min(n*3, len(section_df)), random_state=42):
            path = os.path.join(IMAGE_DIR, f"{img_id}.jpg")
            if os.path.exists(path):
                row = section_df[section_df["id"] == img_id].iloc[0]
                results.append({
                    "id":          int(img_id),
                    "name":        str(row["productDisplayName"]),
                    "color":       str(row["baseColour"]),
                    "articleType": str(row["articleType"]),
                    "image_b64":   img_to_b64(path),
                })
            if len(results) >= n:
                break
        return results

    return {
        "topwear":    sample_with_images(top_df,    req.n),
        "bottomwear": sample_with_images(bottom_df, req.n),
    }

@app.get("/health")
def health():
    return {"status": "ok", "model_ready": model_pants is not None}