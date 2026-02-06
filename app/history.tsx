import { GameHistoryEntry, storageService } from "@/services/storage.service";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function History() {
  const [history, setHistory] = useState<GameHistoryEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const data = await storageService.getHistory();
      setHistory(data);
    } catch {
      console.error("Erreur lors du chargement de l'historique");
      Alert.alert("Erreur", "Impossible de charger l'historique");
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  const clearHistory = () => {
    Alert.alert(
      "Supprimer l'historique",
      "Êtes-vous sûr de vouloir supprimer tout l'historique ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              await storageService.clearAll();
              await loadHistory();
            } catch {
              Alert.alert("Erreur", "Impossible de supprimer l'historique");
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return "À l'instant";
    if (minutes < 60) return `Il y a ${minutes} min`;
    if (hours < 24) return `Il y a ${hours}h`;
    if (days < 7) return `Il y a ${days}j`;
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getPlayerColor = (player: string) => {
    switch (player) {
      case "A":
        return "#007bff";
      case "B":
        return "#28a745";
      case "C":
        return "#dc3545";
      default:
        return "#6c757d";
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="p-4">
          {history.length === 0 ? (
            <View className="items-center justify-center py-20">
              <Ionicons name="time-outline" size={64} color="#6c757d" />
              <Text className="text-xl font-bold text-gray-700 mt-4">
                Aucun historique
              </Text>
              <Text className="text-gray-500 text-center mt-2">
                Les parties terminées apparaîtront ici
              </Text>
            </View>
          ) : (
            <>
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-2xl font-bold text-gray-800">
                  Historique ({history.length})
                </Text>
                <TouchableOpacity
                  onPress={clearHistory}
                  className="bg-red-500 px-3 py-2 rounded-lg"
                >
                  <Text className="text-white font-semibold">Effacer</Text>
                </TouchableOpacity>
              </View>

              {history.map((entry) => (
                <View
                  key={entry.id}
                  className="bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-200"
                >
                  <View className="flex-row justify-between items-start mb-3">
                    <View>
                      <Text className="text-sm text-gray-500">
                        {formatDate(entry.date)}
                      </Text>
                      {entry.winner && (
                        <View className="flex-row items-center mt-1">
                          <Ionicons
                            name="trophy"
                            size={16}
                            color="#ffc107"
                            style={{ marginRight: 4 }}
                          />
                          <Text className="text-sm font-semibold text-yellow-600">
                            Gagnant: Joueur {entry.winner}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-sm font-semibold text-gray-600">
                      Limite: {entry.scoreLimit}
                    </Text>
                  </View>

                  <View className="flex-row justify-around pt-3 border-t border-gray-100">
                    {(["A", "B", "C"] as const).map((player) => (
                      <View
                        key={player}
                        className="items-center"
                        style={{
                          opacity: entry.winner === player ? 1 : 0.7,
                        }}
                      >
                        <Text
                          className="text-xs font-semibold mb-1"
                          style={{ color: getPlayerColor(player) }}
                        >
                          Joueur {player}
                        </Text>
                        <Text
                          className="text-2xl font-bold"
                          style={{ color: getPlayerColor(player) }}
                        >
                          {entry.scores[player]}
                        </Text>
                        {entry.winner === player && (
                          <Ionicons
                            name="star"
                            size={16}
                            color="#ffc107"
                            style={{ marginTop: 4 }}
                          />
                        )}
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
