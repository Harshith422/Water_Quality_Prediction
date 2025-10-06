"""
Sensor Data Preprocessing Module
Handles preprocessing of IoT sensor data from CSV files
"""

import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split
import joblib
import os
import json

class SensorDataPreprocessor:
    def __init__(self, data_dir='../../datasets'):
        self.data_dir = data_dir
        self.scaler = StandardScaler()
        self.label_encoder = LabelEncoder()
        self.feature_columns = []
        
    def load_all_datasets(self):
        """Load and combine all sensor datasets"""
        all_data = []
        
        # Load Aquaponic Fish Pond dataset
        aquaponic_path = os.path.join(self.data_dir, 'Aquaponic Fish Pond', 'pond_iot_2023.csv')
        if os.path.exists(aquaponic_path):
            df_aquaponic = pd.read_csv(aquaponic_path)
            all_data.append(df_aquaponic)
            print(f"Loaded Aquaponic dataset: {len(df_aquaponic)} rows")
        
        # Load IOT pond datasets
        iot_pond_dir = os.path.join(self.data_dir, 'IOT pond')
        if os.path.exists(iot_pond_dir):
            for file in os.listdir(iot_pond_dir):
                if file.endswith('.csv'):
                    df_iot = pd.read_csv(os.path.join(iot_pond_dir, file))
                    all_data.append(df_iot)
                    print(f"Loaded {file}: {len(df_iot)} rows")
        
        # Load Fishpond Visual Condition dataset (sensor data)
        visual_path = os.path.join(self.data_dir, 'Fishpond Visual Condition Dataset', 
                                   'Fishpond Visual Condition Dataset', 'pond_dataset.csv')
        if os.path.exists(visual_path):
            df_visual = pd.read_csv(visual_path)
            all_data.append(df_visual)
            print(f"Loaded Visual dataset: {len(df_visual)} rows")
        
        # Combine all datasets
        if all_data:
            combined_df = pd.concat(all_data, ignore_index=True)
            print(f"\nTotal combined rows: {len(combined_df)}")
            return combined_df
        else:
            raise ValueError("No datasets found!")
    
    def clean_data(self, df):
        """Clean and handle missing values"""
        print(f"\nCleaning data...")
        
        # Create a copy to avoid SettingWithCopyWarning
        df = df.copy()
        
        # Remove duplicate columns (keep first occurrence)
        df = df.loc[:, ~df.columns.duplicated()]
        
        # Remove completely empty columns
        df = df.dropna(axis=1, how='all')
        
        # Remove duplicates rows
        df = df.drop_duplicates()
        
        print(f"Columns after cleaning: {df.columns.tolist()}")
        print(f"Missing values before filling:\n{df.isnull().sum()}")
        
        # Handle missing values
        numeric_columns = df.select_dtypes(include=[np.number]).columns.tolist()
        for col in numeric_columns:
            df[col] = df[col].fillna(df[col].mean())
        
        # Fill categorical missing values
        categorical_columns = df.select_dtypes(include=['object']).columns.tolist()
        for col in categorical_columns:
            mode_val = df[col].mode()
            df[col] = df[col].fillna(mode_val[0] if not mode_val.empty else 'Unknown')
        
        print(f"\nData cleaned successfully!")
        return df
    
    def standardize_columns(self, df):
        """Standardize column names across datasets"""
        # Common column mappings (case-insensitive)
        column_mapping = {
            'ph': 'pH',
            'water_ph': 'pH',
            'temperature': 'Temperature',
            'temp': 'Temperature',
            'water_temp': 'Temperature',
            'temperature(c)': 'Temperature',
            'temperature (c)': 'Temperature',
            'tds': 'TDS',
            'turbidity': 'Turbidity',
            'turbidity(ntu)': 'Turbidity',
            'turbidity (ntu)': 'Turbidity',
            'do': 'DO',
            'dissolved oxygen': 'DO',
            'dissolved oxygen(g/ml)': 'DO',
            'dissolved oxygen (g/ml)': 'DO',
            'dissolved oxygen (mg/l)': 'DO',
            'disolved oxygen': 'DO',
            'water_quality': 'WaterQuality',
            'quality': 'WaterQuality',
            'status': 'WaterQuality'
        }
        
        # Convert all column names to lowercase for matching
        df.columns = df.columns.str.strip().str.lower()
        
        # Rename columns based on mapping
        rename_dict = {}
        for old_col in df.columns:
            for pattern, new_col in column_mapping.items():
                if pattern in old_col:
                    rename_dict[old_col] = new_col
                    break
        
        df = df.rename(columns=rename_dict)
        
        # Keep only relevant columns if they exist
        relevant_cols = ['pH', 'Temperature', 'TDS', 'Turbidity', 'DO', 'WaterQuality']
        existing_cols = [col for col in relevant_cols if col in df.columns]
        
        # Also keep any ID or timestamp columns
        other_cols = [col for col in df.columns if col not in existing_cols 
                     and ('id' in col.lower() or 'date' in col.lower() or 'time' in col.lower())]
        
        keep_cols = existing_cols + other_cols
        df = df[keep_cols] if keep_cols else df
        
        return df
    
    def create_quality_labels(self, df):
        """Create water quality labels based on sensor readings"""
        if 'WaterQuality' not in df.columns:
            # Define water quality thresholds
            conditions = []
            
            # pH should be between 6.5 and 8.5
            if 'pH' in df.columns:
                conditions.append((df['pH'] >= 6.5) & (df['pH'] <= 8.5))
            
            # TDS should be less than 500
            if 'TDS' in df.columns:
                conditions.append(df['TDS'] < 500)
            
            # DO should be greater than 5
            if 'DO' in df.columns:
                conditions.append(df['DO'] > 5)
            
            # Temperature should be between 15 and 30
            if 'Temperature' in df.columns:
                conditions.append((df['Temperature'] >= 15) & (df['Temperature'] <= 30))
            
            # Turbidity should be less than 5
            if 'Turbidity' in df.columns:
                conditions.append(df['Turbidity'] < 5)
            
            # Water is safe if all conditions are met
            if conditions:
                df['WaterQuality'] = np.where(
                    np.all(conditions, axis=0), 
                    'Safe', 
                    'Unsafe'
                )
            else:
                df['WaterQuality'] = 'Unknown'
        
        return df
    
    def create_risk_levels(self, df):
        """Create risk levels: Low, Medium, High"""
        risk_scores = []
        
        for idx, row in df.iterrows():
            score = 0
            
            # pH risk
            if 'pH' in df.columns:
                if row['pH'] < 6.0 or row['pH'] > 9.0:
                    score += 3
                elif row['pH'] < 6.5 or row['pH'] > 8.5:
                    score += 1
            
            # TDS risk
            if 'TDS' in df.columns:
                if row['TDS'] > 1000:
                    score += 3
                elif row['TDS'] > 500:
                    score += 1
            
            # DO risk
            if 'DO' in df.columns:
                if row['DO'] < 3:
                    score += 3
                elif row['DO'] < 5:
                    score += 1
            
            # Turbidity risk
            if 'Turbidity' in df.columns:
                if row['Turbidity'] > 10:
                    score += 3
                elif row['Turbidity'] > 5:
                    score += 1
            
            # Classify risk
            if score >= 6:
                risk = 'High'
            elif score >= 3:
                risk = 'Medium'
            else:
                risk = 'Low'
            
            risk_scores.append(risk)
        
        df['RiskLevel'] = risk_scores
        return df
    
    def extract_features(self, df):
        """Extract relevant features for model training"""
        # Define expected feature columns
        possible_features = ['pH', 'Temperature', 'TDS', 'DO', 'Turbidity']
        self.feature_columns = [col for col in possible_features if col in df.columns]
        
        print(f"\nFeature columns selected: {self.feature_columns}")
        
        if not self.feature_columns:
            raise ValueError("No valid feature columns found in dataset!")
        
        X = df[self.feature_columns].values
        
        # Encode labels
        if 'WaterQuality' in df.columns:
            y_quality = self.label_encoder.fit_transform(df['WaterQuality'])
        else:
            y_quality = np.zeros(len(df))
        
        # Encode risk levels
        if 'RiskLevel' in df.columns:
            risk_encoder = LabelEncoder()
            y_risk = risk_encoder.fit_transform(df['RiskLevel'])
        else:
            y_risk = np.zeros(len(df))
        
        return X, y_quality, y_risk
    
    def normalize_features(self, X_train, X_test):
        """Normalize features using StandardScaler"""
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        return X_train_scaled, X_test_scaled
    
    def create_sequences(self, X, y_quality, y_risk, sequence_length=10):
        """Create time sequences for LSTM"""
        X_seq, y_quality_seq, y_risk_seq = [], [], []
        
        for i in range(len(X) - sequence_length):
            X_seq.append(X[i:i+sequence_length])
            y_quality_seq.append(y_quality[i+sequence_length])
            y_risk_seq.append(y_risk[i+sequence_length])
        
        return np.array(X_seq), np.array(y_quality_seq), np.array(y_risk_seq)
    
    def save_preprocessor(self, save_dir='../saved_models'):
        """Save scaler and encoders"""
        os.makedirs(save_dir, exist_ok=True)
        
        joblib.dump(self.scaler, os.path.join(save_dir, 'scaler.pkl'))
        joblib.dump(self.label_encoder, os.path.join(save_dir, 'label_encoder.pkl'))
        
        # Save feature columns
        with open(os.path.join(save_dir, 'feature_columns.json'), 'w') as f:
            json.dump({'features': self.feature_columns}, f)
        
        print(f"\nPreprocessor saved to {save_dir}")
    
    def preprocess_pipeline(self, sequence_length=10, test_size=0.2):
        """Complete preprocessing pipeline"""
        print("="*50)
        print("Starting Sensor Data Preprocessing Pipeline")
        print("="*50)
        
        # Load data
        df = self.load_all_datasets()
        
        # Remove duplicate columns first
        df = df.loc[:, ~df.columns.duplicated()]
        
        # Standardize columns BEFORE cleaning
        df = self.standardize_columns(df)
        
        # Clean data
        df = self.clean_data(df)
        
        # Create labels
        df = self.create_quality_labels(df)
        df = self.create_risk_levels(df)
        
        # Save processed dataset
        output_path = os.path.join(self.data_dir, 'processed_sensor_data.csv')
        df.to_csv(output_path, index=False)
        print(f"\nProcessed data saved to: {output_path}")
        
        # Extract features
        X, y_quality, y_risk = self.extract_features(df)
        
        # Split data
        X_train, X_test, y_quality_train, y_quality_test, y_risk_train, y_risk_test = train_test_split(
            X, y_quality, y_risk, test_size=test_size, random_state=42
        )
        
        # Normalize
        X_train_scaled, X_test_scaled = self.normalize_features(X_train, X_test)
        
        # Create sequences for LSTM
        X_train_seq, y_quality_train_seq, y_risk_train_seq = self.create_sequences(
            X_train_scaled, y_quality_train, y_risk_train, sequence_length
        )
        X_test_seq, y_quality_test_seq, y_risk_test_seq = self.create_sequences(
            X_test_scaled, y_quality_test, y_risk_test, sequence_length
        )
        
        print(f"\nTraining sequences shape: {X_train_seq.shape}")
        print(f"Testing sequences shape: {X_test_seq.shape}")
        
        # Save preprocessor
        self.save_preprocessor()
        
        return {
            'X_train': X_train_seq,
            'X_test': X_test_seq,
            'y_quality_train': y_quality_train_seq,
            'y_quality_test': y_quality_test_seq,
            'y_risk_train': y_risk_train_seq,
            'y_risk_test': y_risk_test_seq,
            'feature_columns': self.feature_columns,
            'num_classes_quality': len(np.unique(y_quality)),
            'num_classes_risk': len(np.unique(y_risk))
        }

if __name__ == '__main__':
    preprocessor = SensorDataPreprocessor()
    data = preprocessor.preprocess_pipeline()
    
    print("\n" + "="*50)
    print("Preprocessing Complete!")
    print("="*50)

