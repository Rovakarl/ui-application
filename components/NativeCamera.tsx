import { Ionicons } from "@expo/vector-icons";
import {
  CameraType,
  CameraView,
  useCameraPermissions,
} from "expo-camera";
import * as ImageManipulator from "expo-image-manipulator";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

interface NativeCameraProps {
  onImageCaptured: (imageUri: string) => void;
  visible: boolean;
  onClose: () => void;
}

export default function NativeCamera({
  onImageCaptured,
  visible,
  onClose,
}: NativeCameraProps) {
  const [facing, setFacing] = useState<CameraType>("back");
  const [isCapturing, setIsCapturing] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const handleTakePicture = async () => {
    if (isCapturing) return;

    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        Alert.alert(
          "Permission requise",
          "L'application a besoin d'accéder à votre caméra svp."
        );
        return;
      }
    }

    setIsCapturing(true);

    try {
      // Prendre la photo avec la méthode correcte
      if (cameraRef.current) {
        const photo = await (cameraRef.current as any).takePictureAsync({
          quality: 0.8,
          base64: false,
          skipProcessing: false,
        });

        if (photo?.uri) {
          // Redimensionner l'image si nécessaire (max 1200px de largeur)
          const manipulatedImage = await ImageManipulator.manipulateAsync(
            photo.uri,
            [{ resize: { width: 1200 } }],
            {
              compress: 0.8,
              format: ImageManipulator.SaveFormat.JPEG,
            }
          );

          onImageCaptured(manipulatedImage.uri);
          onClose();
        }
      }
    } catch (error) {
      console.error("Erreur lors de la capture:", error);
      Alert.alert("Erreur", "Impossible de prendre la photo. Veuillez réessayer.");
    } finally {
      setIsCapturing(false);
    }
  };

  const flipCamera = () => {
    setFacing(facing === "back" ? "front" : "back");
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      transparent={false}
    >
      <View style={styles.container}>
        <CameraView
          ref={cameraRef as any}
          style={styles.camera}
          facing={facing}
        />
        {/* Overlay en position absolue (pas d'enfant de CameraView) */}
        <View style={styles.overlay} pointerEvents="box-none">
          {/* Bouton fermer */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
          >
            <Ionicons name="close" size={30} color="white" />
          </TouchableOpacity>

          {/* Contrôles en bas */}
          <View style={styles.bottomControls}>
            <TouchableOpacity
              style={styles.flipButton}
              onPress={flipCamera}
            >
              <Ionicons name="camera-reverse" size={30} color="white" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.captureButton,
                isCapturing && styles.captureButtonDisabled,
              ]}
              onPress={handleTakePicture}
              disabled={isCapturing}
            >
              {isCapturing ? (
                <ActivityIndicator color="#007bff" />
              ) : (
                <View style={styles.captureButtonInner} />
              )}
            </TouchableOpacity>

            <View style={styles.placeholder} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",
  },
  closeButton: {
    position: "absolute",
    top: 50,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 12,
    borderRadius: 25,
    zIndex: 10,
  },
  bottomControls: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  flipButton: {
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 15,
    borderRadius: 30,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "white",
    borderWidth: 5,
    borderColor: "#007bff",
    justifyContent: "center",
    alignItems: "center",
  },
  captureButtonInner: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: "#007bff",
  },
  captureButtonDisabled: {
    opacity: 0.6,
  },
  placeholder: {
    width: 60,
  },
});
