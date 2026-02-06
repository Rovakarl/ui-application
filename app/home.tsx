import { View, Text, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useRef } from "react";
import WebViewApp from "@/ui/web-view";
import NativeCamera from "@/components/NativeCamera";
import { WebView } from "react-native-webview";

export default function Home() {
  const [showCamera, setShowCamera] = useState(false);
  const webViewRef = useRef<WebView | null>(null);

  const handleImageCaptured = async (imageUri: string) => {
    try {
      // Convertir l'URI en base64 en utilisant fetch
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      return new Promise<void>((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onloadend = () => {
          const base64data = reader.result as string;
          
          // Attendre un peu pour s'assurer que le WebView est prêt
          setTimeout(() => {
            if (webViewRef.current) {
              // Échapper les caractères spéciaux
              const escapedDataUri = base64data
                .replace(/\\/g, "\\\\")
                .replace(/'/g, "\\'")
                .replace(/"/g, '\\"')
                .replace(/\n/g, "\\n")
                .replace(/\r/g, "\\r");
              
              const script = `
                (function() {
                  try {
                    const img = document.getElementById("imageSrc");
                    const canvas = document.getElementById("canvasOutput");
                    const imageContainer = document.getElementById("imageContainer");
                    if (img) {
                      // Sauvegarder l'ancien onload
                      const originalOnload = img.onload;
                      
                      // Nouveau onload qui appelle l'original
                      img.onload = function() {
                        if (originalOnload && typeof originalOnload === 'function') {
                          originalOnload.call(this);
                        }
                      };
                      
                      // Définir la source
                      img.src = "${escapedDataUri}";
                      img.style.display = "block";
                      if (imageContainer) imageContainer.style.display = "block";
                      if (canvas) canvas.style.display = "block";
                      
                      // Si l'image est déjà chargée (cache)
                      if (img.complete) {
                        img.onload();
                      }
                    }
                  } catch(e) {
                    console.error('Erreur injection image:', e);
                    window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: "ERROR",
                      error: "Erreur lors de l'injection de l'image: " + e.message
                    }));
                  }
                })();
                true;
              `;
              
              webViewRef.current.injectJavaScript(script);
              resolve();
            } else {
              reject(new Error("WebView ref is null"));
            }
          }, 500);
        };
        
        reader.onerror = () => {
          reject(new Error("Erreur lors de la lecture du fichier"));
        };
        
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error("Erreur lors de l'injection de l'image:", error);
      Alert.alert("Erreur", "Impossible de charger l'image. Veuillez réessayer.");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-4 pt-2 pb-1">
        <Text className="text-center text-sm text-gray-600">
          Scanne les dominos pour calculer automatiquement le score
        </Text>
      </View>
      <WebViewApp
        onCameraRequest={() => setShowCamera(true)}
        webViewRef={(ref) => {
          webViewRef.current = ref;
        }}
      />
      <NativeCamera
        visible={showCamera}
        onClose={() => setShowCamera(false)}
        onImageCaptured={handleImageCaptured}
      />
    </SafeAreaView>
  );
}
