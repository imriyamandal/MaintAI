"""
MaintAI ML Training and Evaluation Pipeline
Implements realistic AI4I 2020 dataset generation, feature engineering, multi-model training,
anomaly detection (Isolation Forest), Physics-Informed Tool-Wear Degradation Life Regression, evaluation metrics, and SHAP explainability.
"""

import os
import sys
import json
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, IsolationForest, RandomForestRegressor
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, average_precision_score, confusion_matrix,
    roc_curve, precision_recall_curve
)
import xgboost as xgb
import shap

np.random.seed(42)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "..", "data")
MODELS_DIR = os.path.join(BASE_DIR, "..", "models")
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(MODELS_DIR, exist_ok=True)

def generate_ai4i_dataset(n_samples=10000):
    """
    Generates standard AI4I 2020 Predictive Maintenance Dataset following
    UCI Machine Learning Repository / Matzka (2020) physics specifications.
    """
    udi = np.arange(1, n_samples + 1)
    
    # Machine Type: 50% L (Low), 30% M (Medium), 20% H (High)
    types = np.random.choice(['L', 'M', 'H'], size=n_samples, p=[0.5, 0.3, 0.2])
    
    counts = {'L': 0, 'M': 0, 'H': 0}
    product_ids = []
    for t in types:
        counts[t] += 1
        product_ids.append(f"{t}{counts[t]:05d}")
        
    air_temp = np.random.normal(300.0, 2.0, size=n_samples)
    air_temp = np.round(air_temp, 1)
    
    process_temp = air_temp + 10.0 + np.random.normal(0, 1.0, size=n_samples)
    process_temp = np.round(process_temp, 1)
    
    rotational_speed = np.random.normal(1538, 179, size=n_samples)
    rotational_speed = np.clip(rotational_speed, 1168, 2886).astype(int)
    
    torque = np.random.normal(40.0, 10.0, size=n_samples)
    torque = np.round(np.clip(torque, 3.8, 76.6), 1)
    
    tool_wear = np.random.randint(0, 250, size=n_samples)
    
    # 1. TWF: Tool Wear Failure
    twf = np.zeros(n_samples, dtype=int)
    for i in range(n_samples):
        if tool_wear[i] > 200:
            prob_twf = (tool_wear[i] - 200) / 50.0 * 0.4
            if np.random.rand() < prob_twf:
                twf[i] = 1
                
    # 2. HDF: Heat Dissipation Failure
    temp_diff = process_temp - air_temp
    hdf = ((temp_diff < 8.6) & (rotational_speed < 1380)).astype(int)
    
    # 3. PWF: Power Failure
    power = torque * rotational_speed * (2 * np.pi / 60)
    pwf = ((power < 3500) | (power > 9000)).astype(int)
    
    # 4. OSF: Overstrain Failure
    osf = np.zeros(n_samples, dtype=int)
    for i in range(n_samples):
        prod = tool_wear[i] * torque[i]
        limit = 11000 if types[i] == 'L' else (12000 if types[i] == 'M' else 13000)
        if prod > limit:
            osf[i] = 1
            
    # 5. RNF: Random Failure
    rnf = (np.random.rand(n_samples) < 0.001).astype(int)
    
    machine_failure = (twf | hdf | pwf | osf | rnf).astype(int)
    
    df = pd.DataFrame({
        'UDI': udi,
        'Product ID': product_ids,
        'Type': types,
        'air_temperature': air_temp,
        'process_temperature': process_temp,
        'rotational_speed': rotational_speed,
        'torque': torque,
        'tool_wear': tool_wear,
        'Machine failure': machine_failure,
        'TWF': twf,
        'HDF': hdf,
        'PWF': pwf,
        'OSF': osf,
        'RNF': rnf
    })
    
    return df

def feature_engineering(df):
    """
    Computes domain-specific industrial physics features with clean XGBoost-compatible names.
    """
    data = df.copy()
    
    # Temperature difference
    data['temp_diff'] = data['process_temperature'] - data['air_temperature']
    
    # Mechanical Power (Watts) = Torque * (RPM * 2 * pi / 60)
    data['power'] = data['torque'] * data['rotational_speed'] * (2 * np.pi / 60)
    
    # Overstrain Product = Torque * Tool wear
    data['overstrain_index'] = data['torque'] * data['tool_wear']
    
    # Heat Dissipation Risk
    data['heat_dissipation_risk'] = data['rotational_speed'] / (data['temp_diff'] + 1e-3)
    
    # Torque to RPM Ratio
    data['torque_rpm_ratio'] = data['torque'] / (data['rotational_speed'] + 1e-3)
    
    # Type One-Hot
    if 'Type' in data.columns:
        data['type_l'] = (data['Type'] == 'L').astype(float)
        data['type_m'] = (data['Type'] == 'M').astype(float)
        data['type_h'] = (data['Type'] == 'H').astype(float)
    else:
        data['type_l'] = 0.0
        data['type_m'] = 1.0
        data['type_h'] = 0.0
            
    return data

def train_and_evaluate():
    print("=== Starting MaintAI ML Pipeline Training ===", flush=True)
    
    # 1. Generate/Load Dataset
    dataset_path = os.path.join(DATA_DIR, "ai4i2020_dataset.csv")
    df = generate_ai4i_dataset(10000)
    df.to_csv(dataset_path, index=False)
    print(f"Dataset saved to {dataset_path}. Total samples: {len(df)}, Failures: {df['Machine failure'].sum()} ({df['Machine failure'].mean()*100:.2f}%)", flush=True)
    
    # 2. Feature Engineering
    df_feat = feature_engineering(df)
    
    feature_cols = [
        'air_temperature',
        'process_temperature',
        'rotational_speed',
        'torque',
        'tool_wear',
        'temp_diff',
        'power',
        'overstrain_index',
        'heat_dissipation_risk',
        'torque_rpm_ratio',
        'type_l',
        'type_m',
        'type_h'
    ]
    
    X = df_feat[feature_cols]
    y = df_feat['Machine failure']
    
    # 3. Train/Val/Test Split (70/15/15 stratified)
    X_train, X_temp, y_train, y_temp = train_test_split(X, y, test_size=0.30, random_state=42, stratify=y)
    X_val, X_test, y_val, y_test = train_test_split(X_temp, y_temp, test_size=0.50, random_state=42, stratify=y_temp)
    
    print(f"Train size: {len(X_train)}, Val size: {len(X_val)}, Test size: {len(X_test)}", flush=True)
    
    # 4. Standard Scaling
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_val_scaled = scaler.transform(X_val)
    X_test_scaled = scaler.transform(X_test)
    
    joblib.dump(scaler, os.path.join(MODELS_DIR, "scaler.joblib"))
    
    # 5. Train Models
    neg_count = (y_train == 0).sum()
    pos_count = (y_train == 1).sum()
    scale_pos_weight = float(neg_count / max(1, pos_count))
    
    models = {
        'logistic_regression': LogisticRegression(class_weight='balanced', max_iter=1000, random_state=42),
        'random_forest': RandomForestClassifier(n_estimators=80, max_depth=10, class_weight='balanced', random_state=42, n_jobs=1),
        'gradient_boosting': GradientBoostingClassifier(n_estimators=100, learning_rate=0.08, max_depth=5, random_state=42),
        'xgboost': xgb.XGBClassifier(
            n_estimators=120,
            learning_rate=0.05,
            max_depth=5,
            scale_pos_weight=scale_pos_weight * 0.7,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42,
            eval_metric='logloss',
            n_jobs=1
        )
    }
    
    model_metrics = {}
    fitted_models = {}
    
    for name, model in models.items():
        print(f"Training {name}...", flush=True)
        if name in ['logistic_regression']:
            model.fit(X_train_scaled, y_train)
            test_preds = model.predict(X_test_scaled)
            test_probs = model.predict_proba(X_test_scaled)[:, 1]
        else:
            model.fit(X_train, y_train)
            test_preds = model.predict(X_test)
            test_probs = model.predict_proba(X_test)[:, 1]
            
        fitted_models[name] = model
        joblib.dump(model, os.path.join(MODELS_DIR, f"{name}.joblib"))
        
        acc = float(accuracy_score(y_test, test_preds))
        prec = float(precision_score(y_test, test_preds, zero_division=0))
        rec = float(recall_score(y_test, test_preds, zero_division=0))
        f1 = float(f1_score(y_test, test_preds, zero_division=0))
        roc_auc = float(roc_auc_score(y_test, test_probs))
        pr_auc = float(average_precision_score(y_test, test_probs))
        cm = confusion_matrix(y_test, test_preds).tolist()
        
        fpr, tpr, _ = roc_curve(y_test, test_probs)
        precisions, recalls, _ = precision_recall_curve(y_test, test_probs)
        
        indices_roc = np.linspace(0, len(fpr) - 1, min(40, len(fpr))).astype(int)
        indices_pr = np.linspace(0, len(recalls) - 1, min(40, len(recalls))).astype(int)
        
        model_metrics[name] = {
            'accuracy': round(acc, 4),
            'precision': round(prec, 4),
            'recall': round(rec, 4),
            'f1_score': round(f1, 4),
            'roc_auc': round(roc_auc, 4),
            'pr_auc': round(pr_auc, 4),
            'confusion_matrix': cm,
            'roc_curve': [{'fpr': round(float(fpr[i]), 4), 'tpr': round(float(tpr[i]), 4)} for i in indices_roc],
            'pr_curve': [{'recall': round(float(recalls[i]), 4), 'precision': round(float(precisions[i]), 4)} for i in indices_pr]
        }
        
        print(f"[{name}] Acc: {acc:.4f} | Prec: {prec:.4f} | Recall: {rec:.4f} | F1: {f1:.4f} | ROC-AUC: {roc_auc:.4f} | PR-AUC: {pr_auc:.4f}", flush=True)
        
    # 6. Train Anomaly Detection (Isolation Forest)
    print("Training Isolation Forest Anomaly Detector...", flush=True)
    iso_forest = IsolationForest(n_estimators=80, contamination=0.04, random_state=42, n_jobs=1)
    iso_forest.fit(X_train)
    joblib.dump(iso_forest, os.path.join(MODELS_DIR, "isolation_forest.joblib"))
    
    # 7. Train Physics-Informed Tool-Wear Degradation Life Regressor
    print("Training Physics-Informed Tool-Wear Degradation Model...", flush=True)
    rul_target = np.clip(250.0 - df_feat['tool_wear'] * (1.0 + (df_feat['torque'] - 40.0) / 100.0), 0, 300)
    rul_train = rul_target.iloc[X_train.index]
    rul_regressor = RandomForestRegressor(n_estimators=50, max_depth=8, random_state=42, n_jobs=1)
    rul_regressor.fit(X_train, rul_train)
    joblib.dump(rul_regressor, os.path.join(MODELS_DIR, "rul_model.joblib"))
    
    # 8. SHAP Explainability Engine
    print("Computing SHAP TreeExplainer on XGBoost model...", flush=True)
    best_model = fitted_models['xgboost']
    explainer = shap.TreeExplainer(best_model)
    joblib.dump(explainer, os.path.join(MODELS_DIR, "shap_explainer.joblib"))
    
    sample_X = X_test.iloc[:200]
    shap_values = explainer.shap_values(sample_X)
    mean_abs_shap = np.abs(shap_values).mean(axis=0)
    
    global_importance = []
    for col, imp in sorted(zip(feature_cols, mean_abs_shap), key=lambda x: x[1], reverse=True):
        global_importance.append({
            'feature': col,
            'importance': round(float(imp), 4)
        })
        
    numeric_df = df_feat[feature_cols]
    corr_matrix = numeric_df.corr().round(3).to_dict()
    
    metadata = {
        'selected_model': 'xgboost',
        'features': feature_cols,
        'dataset_summary': {
            'total_records': len(df),
            'failures_count': int(df['Machine failure'].sum()),
            'failure_rate_pct': round(float(df['Machine failure'].mean() * 100), 2),
            'failure_modes': {
                'TWF (Tool Wear Failure)': int(df['TWF'].sum()),
                'HDF (Heat Dissipation Failure)': int(df['HDF'].sum()),
                'PWF (Power Failure)': int(df['PWF'].sum()),
                'OSF (Overstrain Failure)': int(df['OSF'].sum()),
                'RNF (Random Failure)': int(df['RNF'].sum())
            },
            'type_distribution': df['Type'].value_counts().to_dict()
        },
        'models': model_metrics,
        'global_shap_importance': global_importance,
        'correlations': corr_matrix
    }
    
    with open(os.path.join(MODELS_DIR, "model_metadata.json"), "w") as f:
        json.dump(metadata, f, indent=2)
        
    print("=== Training Pipeline Completed Successfully ===", flush=True)

if __name__ == '__main__':
    train_and_evaluate()
