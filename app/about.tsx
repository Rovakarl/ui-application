import React from "react";
import { View, Text, ScrollView, Linking, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function About() {
  const openLink = (url: string) => {
    Linking.openURL(url).catch((err) =>
      console.error("Erreur lors de l'ouverture du lien:", err)
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1">
        <View className="p-6">
          {/* Header */}
          <View className="items-center mb-8">
            <View className="bg-blue-500 rounded-full p-6 mb-4">
              <Ionicons name="camera" size={48} color="white" />
            </View>
            <Text className="text-3xl font-bold text-gray-800 mb-2">
              PipCam
            </Text>
            <Text className="text-gray-600 text-center">
              Détection automatique des pips de dominos
            </Text>
            <Text className="text-sm text-gray-500 mt-2">Version 1.0.0</Text>
          </View>

          {/* Description */}
          <View className="bg-white rounded-xl p-5 mb-4 shadow-sm">
            <Text className="text-lg font-semibold text-gray-800 mb-3">
              À propos
            </Text>
            <Text className="text-gray-600 leading-6">
              PipCam est une application qui utilise la vision par ordinateur
              (OpenCV.js) pour détecter automatiquement les pips sur les
              dominos et calculer les scores de manière automatique. Parfait
              pour suivre vos parties de dominos entre amis !
            </Text>
          </View>

          {/* Fonctionnalités */}
          <View className="bg-white rounded-xl p-5 mb-4 shadow-sm">
            <Text className="text-lg font-semibold text-gray-800 mb-3">
              Fonctionnalités
            </Text>
            <View className="space-y-3">
              {[
                {
                  icon: "camera",
                  title: "Détection automatique",
                  desc: "Scannez les dominos et obtenez le score instantanément",
                },
                {
                  icon: "people",
                  title: "Multi-joueurs",
                  desc: "Suivez les scores de jusqu'à 3 joueurs",
                },
                {
                  icon: "save",
                  title: "Sauvegarde automatique",
                  desc: "Vos scores sont sauvegardés automatiquement",
                },
                {
                  icon: "time",
                  title: "Historique",
                  desc: "Consultez l'historique de vos parties",
                },
              ].map((feature, index) => (
                <View key={index} className="flex-row items-start mb-3">
                  <View className="bg-blue-100 rounded-full p-2 mr-3">
                    <Ionicons name={feature.icon as any} size={20} color="#007bff" />
                  </View>
                  <View className="flex-1">
                    <Text className="font-semibold text-gray-800">
                      {feature.title}
                    </Text>
                    <Text className="text-sm text-gray-600">
                      {feature.desc}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Technologies */}
          <View className="bg-white rounded-xl p-5 mb-4 shadow-sm">
            <Text className="text-lg font-semibold text-gray-800 mb-3">
              Technologies
            </Text>
            <View className="flex-row flex-wrap">
              {["React Native", "Expo", "OpenCV.js", "TypeScript"].map(
                (tech, index) => (
                  <View
                    key={index}
                    className="bg-blue-50 px-3 py-2 rounded-lg mr-2 mb-2"
                  >
                    <Text className="text-blue-700 font-medium">{tech}</Text>
                  </View>
                )
              )}
            </View>
          </View>

          {/* Liens */}
          <View className="bg-white rounded-xl p-5 mb-4 shadow-sm">
            <Text className="text-lg font-semibold text-gray-800 mb-3">
              Ressources
            </Text>
            <TouchableOpacity
              onPress={() => openLink("https://docs.expo.dev/")}
              className="flex-row items-center py-3 border-b border-gray-100"
            >
              <Ionicons name="document-text" size={20} color="#007bff" />
              <Text className="ml-3 text-blue-600 flex-1">
                Documentation Expo
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#6c757d" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => openLink("https://docs.opencv.org/")}
              className="flex-row items-center py-3 border-b border-gray-100"
            >
              <Ionicons name="code" size={20} color="#007bff" />
              <Text className="ml-3 text-blue-600 flex-1">
                Documentation OpenCV
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#6c757d" />
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View className="items-center mt-4 mb-8">
            <Text className="text-sm text-gray-500 text-center">
              Développé avec ❤️ pour les amateurs de dominos
            </Text>
            <Text className="text-xs text-gray-400 mt-2">
              © 2026 PipCam
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
