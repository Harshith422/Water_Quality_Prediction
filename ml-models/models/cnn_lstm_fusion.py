"""
CNN + LSTM Fusion Model for Water Quality Monitoring
Combines image features (CNN) and sensor time-series data (LSTM)
"""

import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers, Model
from tensorflow.keras.applications import MobileNetV2, ResNet50
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.callbacks import ModelCheckpoint, EarlyStopping, ReduceLROnPlateau
import numpy as np

class WaterQualityFusionModel:
    def __init__(self, img_size=(224, 224), sequence_length=10, num_features=5):
        self.img_size = img_size
        self.sequence_length = sequence_length
        self.num_features = num_features
        self.model = None
        
    def build_cnn_branch(self, use_pretrained=True):
        """Build CNN branch for image feature extraction"""
        if use_pretrained:
            # Use pre-trained MobileNetV2 for efficient feature extraction
            base_model = MobileNetV2(
                input_shape=(*self.img_size, 3),
                include_top=False,
                weights='imagenet'
            )
            # Freeze early layers
            for layer in base_model.layers[:-30]:
                layer.trainable = False
            
            # Add custom layers
            x = base_model.output
            x = layers.GlobalAveragePooling2D()(x)
            x = layers.Dense(256, activation='relu')(x)
            x = layers.Dropout(0.5)(x)
            x = layers.Dense(128, activation='relu', name='cnn_features')(x)
            
            cnn_model = Model(inputs=base_model.input, outputs=x, name='CNN_Branch')
        else:
            # Build custom CNN from scratch
            inputs = layers.Input(shape=(*self.img_size, 3))
            
            x = layers.Conv2D(32, (3, 3), activation='relu', padding='same')(inputs)
            x = layers.MaxPooling2D((2, 2))(x)
            x = layers.BatchNormalization()(x)
            
            x = layers.Conv2D(64, (3, 3), activation='relu', padding='same')(x)
            x = layers.MaxPooling2D((2, 2))(x)
            x = layers.BatchNormalization()(x)
            
            x = layers.Conv2D(128, (3, 3), activation='relu', padding='same')(x)
            x = layers.MaxPooling2D((2, 2))(x)
            x = layers.BatchNormalization()(x)
            
            x = layers.Conv2D(256, (3, 3), activation='relu', padding='same')(x)
            x = layers.GlobalAveragePooling2D()(x)
            
            x = layers.Dense(256, activation='relu')(x)
            x = layers.Dropout(0.5)(x)
            x = layers.Dense(128, activation='relu', name='cnn_features')(x)
            
            cnn_model = Model(inputs=inputs, outputs=x, name='CNN_Branch')
        
        return cnn_model
    
    def build_lstm_branch(self):
        """Build LSTM branch for sensor time-series analysis"""
        inputs = layers.Input(shape=(self.sequence_length, self.num_features))
        
        # Bidirectional LSTM layers
        x = layers.Bidirectional(layers.LSTM(128, return_sequences=True))(inputs)
        x = layers.Dropout(0.3)(x)
        
        x = layers.Bidirectional(layers.LSTM(64, return_sequences=False))(x)
        x = layers.Dropout(0.3)(x)
        
        x = layers.Dense(128, activation='relu')(x)
        x = layers.Dense(64, activation='relu', name='lstm_features')(x)
        
        lstm_model = Model(inputs=inputs, outputs=x, name='LSTM_Branch')
        
        return lstm_model
    
    def build_fusion_model(self, num_quality_classes=2, num_risk_classes=3):
        """Build complete fusion model"""
        # Image input
        img_input = layers.Input(shape=(*self.img_size, 3), name='image_input')
        
        # Sensor input
        sensor_input = layers.Input(shape=(self.sequence_length, self.num_features), name='sensor_input')
        
        # CNN branch
        cnn_branch = self.build_cnn_branch(use_pretrained=True)
        cnn_features = cnn_branch(img_input)
        
        # LSTM branch
        lstm_branch = self.build_lstm_branch()
        lstm_features = lstm_branch(sensor_input)
        
        # Fusion layer - concatenate features
        merged = layers.concatenate([cnn_features, lstm_features], name='fusion_layer')
        
        # Shared dense layers
        x = layers.Dense(256, activation='relu')(merged)
        x = layers.Dropout(0.5)(x)
        x = layers.Dense(128, activation='relu')(x)
        x = layers.Dropout(0.3)(x)
        
        # Output branches
        # Quality prediction (Safe/Unsafe)
        quality_output = layers.Dense(
            num_quality_classes, 
            activation='softmax', 
            name='quality_output'
        )(x)
        
        # Risk level prediction (Low/Medium/High)
        risk_output = layers.Dense(
            num_risk_classes, 
            activation='softmax', 
            name='risk_output'
        )(x)
        
        # Create model
        self.model = Model(
            inputs=[img_input, sensor_input],
            outputs=[quality_output, risk_output],
            name='WaterQuality_Fusion_Model'
        )
        
        return self.model
    
    def compile_model(self, learning_rate=0.001):
        """Compile the model"""
        self.model.compile(
            optimizer=Adam(learning_rate=learning_rate),
            loss={
                'quality_output': 'sparse_categorical_crossentropy',
                'risk_output': 'sparse_categorical_crossentropy'
            },
            loss_weights={
                'quality_output': 1.0,
                'risk_output': 0.8
            },
            metrics={
                'quality_output': ['accuracy'],
                'risk_output': ['accuracy']
            }
        )
        
        return self.model
    
    def get_callbacks(self, save_dir='../saved_models'):
        """Create training callbacks"""
        callbacks = [
            ModelCheckpoint(
                filepath=f'{save_dir}/best_fusion_model.h5',
                monitor='val_quality_output_accuracy',
                save_best_only=True,
                mode='max',
                verbose=1
            ),
            EarlyStopping(
                monitor='val_loss',
                patience=15,
                restore_best_weights=True,
                verbose=1
            ),
            ReduceLROnPlateau(
                monitor='val_loss',
                factor=0.5,
                patience=5,
                min_lr=1e-7,
                verbose=1
            )
        ]
        
        return callbacks
    
    def summary(self):
        """Print model summary"""
        if self.model:
            self.model.summary()
        else:
            print("Model not built yet!")


class SingleModalityModels:
    """Individual CNN and LSTM models for comparison"""
    
    @staticmethod
    def build_cnn_only(img_size=(224, 224), num_classes=2):
        """CNN-only model for image classification"""
        base_model = MobileNetV2(
            input_shape=(*img_size, 3),
            include_top=False,
            weights='imagenet'
        )
        
        for layer in base_model.layers[:-20]:
            layer.trainable = False
        
        inputs = layers.Input(shape=(*img_size, 3))
        x = base_model(inputs)
        x = layers.GlobalAveragePooling2D()(x)
        x = layers.Dense(256, activation='relu')(x)
        x = layers.Dropout(0.5)(x)
        x = layers.Dense(128, activation='relu')(x)
        x = layers.Dropout(0.3)(x)
        outputs = layers.Dense(num_classes, activation='softmax')(x)
        
        model = Model(inputs=inputs, outputs=outputs, name='CNN_Only')
        model.compile(
            optimizer=Adam(0.001),
            loss='sparse_categorical_crossentropy',
            metrics=['accuracy']
        )
        
        return model
    
    @staticmethod
    def build_lstm_only(sequence_length=10, num_features=5, num_classes=2):
        """LSTM-only model for sensor data classification"""
        inputs = layers.Input(shape=(sequence_length, num_features))
        
        x = layers.Bidirectional(layers.LSTM(128, return_sequences=True))(inputs)
        x = layers.Dropout(0.3)(x)
        x = layers.Bidirectional(layers.LSTM(64, return_sequences=False))(x)
        x = layers.Dropout(0.3)(x)
        x = layers.Dense(128, activation='relu')(x)
        x = layers.Dropout(0.3)(x)
        x = layers.Dense(64, activation='relu')(x)
        outputs = layers.Dense(num_classes, activation='softmax')(x)
        
        model = Model(inputs=inputs, outputs=outputs, name='LSTM_Only')
        model.compile(
            optimizer=Adam(0.001),
            loss='sparse_categorical_crossentropy',
            metrics=['accuracy']
        )
        
        return model


if __name__ == '__main__':
    # Test model building
    print("Building Water Quality Fusion Model...")
    
    fusion_model = WaterQualityFusionModel(
        img_size=(224, 224),
        sequence_length=10,
        num_features=5
    )
    
    model = fusion_model.build_fusion_model()
    fusion_model.compile_model()
    fusion_model.summary()
    
    print("\nModel built successfully!")
    print(f"Total parameters: {model.count_params():,}")

