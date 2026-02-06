import { storageService } from "@/services/storage.service";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView } from "react-native-webview";

interface WebViewAppProps {
  onCameraRequest?: () => void;
  webViewRef?: (ref: WebView | null) => void;
}

export default function WebViewApp({
  onCameraRequest,
  webViewRef: setWebViewRef,
}: WebViewAppProps = {}) {
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [opencvReady, setOpencvReady] = useState(false);
  // const [webViewLoaded, setWebViewLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const timeoutRef = useRef<any>(null);

  // Exposer la ref au parent
  useEffect(() => {
    if (setWebViewRef) {
      setWebViewRef(webViewRef.current);
    }
  }, [setWebViewRef]);

  // Charger les données sauvegardées au démarrage
  useEffect(() => {
    loadSavedData();

    // Timeout de sécurité : cacher le loader après 20 secondes
    timeoutRef.current = setTimeout(() => {
      if (!opencvReady) {
        console.warn("Timeout: OpenCV.js n'a pas été chargé dans les 20 secondes");
        setIsLoading(false);
        setLoadError("Le chargement d'OpenCV.js prend plus de temps que prévu. L'application devrait fonctionner normalement.");
      }
    }, 20000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSavedData = async () => {
    try {
      const [scores, scoreLimit, currentPlayer, gameFinished] = await Promise.all([
        storageService.getScores(),
        storageService.getScoreLimit(),
        storageService.getCurrentPlayer(),
        storageService.getGameFinished(),
      ]);

      if (scores || scoreLimit || currentPlayer) {
        // Envoyer les données au WebView
        setTimeout(() => {
          webViewRef.current?.postMessage(
            JSON.stringify({
              type: "LOAD_DATA",
              data: {
                scores: scores || { A: 0, B: 0, C: 0 },
                scoreLimit: scoreLimit || 100,
                currentPlayer: currentPlayer || "A",
                gameFinished: gameFinished || false,
              },
            })
          );
        }, 1000);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des données:", error);
    }
  };

  const handleMessage = async (event: any) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);

      switch (message.type) {
        case "OPENCV_READY":
          setOpencvReady(true);
          setIsLoading(false);
          setLoadError(null);
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          break;

        case "WEBVIEW_LOADED":
          // setWebViewLoaded(true);
          break;

        case "SAVE_SCORES":
          await storageService.saveScores(message.data.scores);
          await storageService.saveCurrentPlayer(message.data.currentPlayer);
          await storageService.saveScoreLimit(message.data.scoreLimit);
          await storageService.saveGameFinished(message.data.gameFinished);
          break;

        case "RESET_SCORES":
          await storageService.resetScores();
          break;

        case "GAME_FINISHED":
          // Feedback haptique quand un joueur gagne
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          // Sauvegarder dans l'historique
          await storageService.addToHistory({
            scores: message.data.scores,
            winner: message.data.winner,
            scoreLimit: message.data.scoreLimit,
          });
          break;

        case "ERROR":
          console.error("Erreur depuis WebView:", message.error);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;

        case "PROCESSING_START":
          setIsLoading(true);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;

        case "PROCESSING_END":
          setIsLoading(false);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;

        case "OPEN_CAMERA":
          if (onCameraRequest) {
            onCameraRequest();
          }
          break;
      }
    } catch (error) {
      console.error("Erreur lors du traitement du message:", error);
    }
  };

  // Note: OpenCV.js est chargé depuis le CDN dans le HTML
  // Pour utiliser le fichier local, il faudrait l'injecter directement dans le HTML
  // ou utiliser expo-asset pour charger le fichier

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>Domino Pip Detection - 3 Joueurs</title>
    <style>
      * { box-sizing: border-box; }
      body { 
        margin: 0; 
        padding: 8px; 
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
        background-color: #f0f2f5;
        overflow-x: hidden;
        overflow-y: hidden;
        height: 100vh;
        display: flex;
        flex-direction: column;
      }
      .container {
        max-width: 620px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        gap: 8px;
        flex: 1;
        overflow-y: auto;
      }
      .card {
        background: white;
        padding: 10px;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        flex-shrink: 0;
        box-sizing: border-box;
        overflow: hidden;
        word-wrap: break-word;
        overflow-wrap: break-word;
      }
      .loader {
        display: none;
        text-align: center;
        padding: 20px;
        color: #007bff;
        font-weight: bold;
      }
      .loader.active {
        display: block;
      }
      .error-message {
        display: none;
        background: #f8d7da;
        color: #721c24;
        padding: 10px;
        border-radius: 5px;
        margin: 10px 0;
      }
      .error-message.show {
        display: block;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h2 style="text-align: center; margin: 0 0 8px 0; font-size: 1.3em;">Détection des pips - 3 Joueurs</h2>
      <p id="status" style="display: none; text-align: center; color: #6c757d; margin: 0 0 8px 0;">Chargement d'OpenCV.js...</p>

      <div class="loader" id="loader" style="display: none;">
        <div>⏳ Traitement de l'image en cours...</div>
      </div>

      <div class="error-message" id="errorMessage"></div>

      <!-- SCORE LIMITE -->
      <div class="card">
        <label style="font-size: 1em; font-weight: bold; display: block; margin-bottom: 8px;">
          Score final (pour gagner)
        </label>
        <input 
          id="scoreLimit" 
          type="number" 
          value="100" 
          min="10" 
          max="1000" 
          step="10"
          style="width: 100%; padding: 8px; font-size: 0.95em; border: 2px solid #007bff; border-radius: 8px;"
        />
      </div>

      <!-- Sélection du joueur -->
      <div class="card" style="display: flex; gap: 8px; justify-content: center; padding: 8px;">
        <button id="playerA" class="player-btn active" style="
          padding: 8px 16px;
          font-size: 1em;
          font-weight: bold;
          border: 2px solid #007bff;
          background-color: #007bff;
          color: white;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        ">Joueur A</button>
        <button id="playerB" class="player-btn" style="
          padding: 8px 16px;
          font-size: 1em;
          font-weight: bold;
          border: 2px solid #ccc;
          background-color: white;
          color: #333;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        ">Joueur B</button>
        <button id="playerC" class="player-btn" style="
          padding: 8px 16px;
          font-size: 1em;
          font-weight: bold;
          border: 2px solid #ccc;
          background-color: white;
          color: #333;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        ">Joueur C</button>
      </div>

      <!-- Bouton caméra - sera remplacé par un bouton natif -->
      <div id="cameraButtonContainer" style="display: flex; justify-content: center; margin: 4px 0;">
        <div id="cameraButtonPlaceholder" style="
          display: flex; 
          align-items: center; 
          justify-content: center;
          width: 60px; 
          height: 60px; 
          font-size: 1.5em;
          background-color: #007bff; 
          color: white; 
          border-radius: 50%;
          cursor: pointer; 
          box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        ">
          📷
        </div>
      </div>
      <input type="file" id="fileInput" accept="image/*" capture="camera" hidden />

      <!-- Conteneur pour l'image et le résultat -->
      <div id="imageContainer" class="card" style="display: none; padding: 12px;">
        <div style="text-align: center; margin-bottom: 10px; font-weight: bold; color: #007bff; font-size: 1em;">
          📸 Image scannée avec détection des pips
        </div>
        <div style="display: flex; flex-direction: column; gap: 10px; align-items: center;">
          <div style="width: 100%; text-align: center; font-size: 0.85em; color: #6c757d; margin-bottom: 4px;">
            Image originale
          </div>
          <img id="imageSrc" style="max-width: 100%; max-height: 280px; width: auto; border-radius: 8px; display: none; object-fit: contain; border: 3px solid #007bff; background: #f8f9fa; box-shadow: 0 2px 8px rgba(0,123,255,0.3);" />
          <div style="width: 100%; text-align: center; font-size: 0.85em; color: #6c757d; margin-top: 4px; margin-bottom: 4px;">
            Résultat avec pips détectés (cercles bleus et rouges)
          </div>
          <canvas id="canvasOutput" style="max-width: 100%; max-height: 280px; width: auto; border-radius: 8px; display: none; border: 3px solid #28a745; background: #f8f9fa; box-shadow: 0 2px 8px rgba(40,167,69,0.3);"></canvas>
        </div>
      </div>

      <div id="totalPips" class="card" style="font-size: 1em; font-weight: bold; text-align: center; min-height: 28px; margin: 8px 0; padding: 8px; color: #007bff; word-wrap: break-word; overflow-wrap: break-word; max-width: 100%; box-sizing: border-box; overflow: hidden;"></div>

      <!-- Scores -->
      <div class="card">
        <h3 style="text-align: center; color: #007bff; margin: 0 0 10px 0; font-size: 1.1em;">Scores</h3>
        <div style="display: flex; justify-content: space-around;">
          <div style="text-align: center;">
            <div style="font-weight: bold; margin-bottom: 4px; font-size: 0.9em;">Joueur A</div>
            <div id="scoreA" style="font-size: 1.8em; color: #007bff;">0</div>
          </div>
          <div style="text-align: center;">
            <div style="font-weight: bold; margin-bottom: 4px; font-size: 0.9em;">Joueur B</div>
            <div id="scoreB" style="font-size: 1.8em; color: #28a745;">0</div>
          </div>
          <div style="text-align: center;">
            <div style="font-weight: bold; margin-bottom: 4px; font-size: 0.9em;">Joueur C</div>
            <div id="scoreC" style="font-size: 1.8em; color: #dc3545;">0</div>
          </div>
        </div>

        <button id="resetBtn" style="
          margin-top: 10px; 
          width: 100%; 
          padding: 10px; 
          font-size: 1em;
          background: #6c757d; 
          color: white; 
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: bold;
        ">Réinitialiser les scores</button>
      </div>

      <!-- Gagnant -->
      <div id="winnerBox" style="
        font-size: 1.2em;
        font-weight: bold; 
        color: #28a745; 
        text-align: center;
        padding: 10px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        flex-shrink: 0;
      "></div>
    </div>

    <!-- Chargement d'OpenCV.js depuis le CDN officiel -->
    <script async src="https://docs.opencv.org/4.5.0/opencv.js"></script>

    <script>
      (function() {
        let imgElement = document.getElementById("imageSrc");
        let inputElement = document.getElementById("fileInput");
        let loader = document.getElementById("loader");
        let errorMessage = document.getElementById("errorMessage");
        let canvas = document.getElementById("canvasOutput");
        let imageContainer = document.getElementById("imageContainer");

        let currentPlayer = "A";
        let scores = { A: 0, B: 0, C: 0 };
        let gameFinished = false;
        let isProcessing = false;

        // Fonction pour envoyer des messages à React Native
        function sendMessage(type, data) {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type, ...data }));
          }
        }

        // Gérer le clic sur le bouton caméra
        document.getElementById("cameraButtonPlaceholder").onclick = () => {
          sendMessage("OPEN_CAMERA", {});
        };

        // Fonction pour afficher les erreurs
        function showError(message) {
          errorMessage.textContent = "❌ " + message;
          errorMessage.classList.add("show");
          setTimeout(() => {
            errorMessage.classList.remove("show");
          }, 5000);
          sendMessage("ERROR", { error: message });
        }

        // Fonction pour valider les entrées
        function validateInput(value, min, max, name) {
          const num = parseInt(value);
          if (isNaN(num) || num < min || num > max) {
            showError(\`\${name} doit être entre \${min} et \${max}\`);
            return null;
          }
          return num;
        }

        // Écouter les messages de React Native
        document.addEventListener("message", function(event) {
          try {
            const message = JSON.parse(event.data);
            if (message.type === "LOAD_DATA") {
              const data = message.data;
              scores = data.scores || scores;
              currentPlayer = data.currentPlayer || currentPlayer;
              gameFinished = data.gameFinished || false;
              
              document.getElementById("scoreLimit").value = data.scoreLimit || 100;
              updateScoreDisplay();
              selectPlayer(currentPlayer);
              
              if (gameFinished) {
                checkWinner();
              }
            }
          } catch (e) {
            console.error("Erreur lors du traitement du message:", e);
          }
        });

        // Gestion des boutons joueurs
        document.getElementById("playerA").onclick = () => selectPlayer("A");
        document.getElementById("playerB").onclick = () => selectPlayer("B");
        document.getElementById("playerC").onclick = () => selectPlayer("C");

        function selectPlayer(p) {
          if(gameFinished || isProcessing) return;
          currentPlayer = p;
          document.querySelectorAll(".player-btn").forEach(b => {
            b.style.background = "white";
            b.style.color = "#333";
            b.style.border = "2px solid #ccc";
          });
          let btn = document.getElementById("player" + p);
          btn.style.background = "#007bff";
          btn.style.color = "white";
          btn.style.border = "2px solid #007bff";
          
          sendMessage("SAVE_SCORES", {
            data: { scores, currentPlayer, scoreLimit: parseInt(document.getElementById("scoreLimit").value), gameFinished }
          });
        }

        document.getElementById("resetBtn").onclick = () => {
          if (confirm("Êtes-vous sûr de vouloir réinitialiser tous les scores ?")) {
            scores = { A: 0, B: 0, C: 0 };
            gameFinished = false;
            updateScoreDisplay();
            document.getElementById("winnerBox").innerHTML = "";
            sendMessage("RESET_SCORES", {});
          }
        };

        function updateScoreDisplay() {
          document.getElementById("scoreA").textContent = scores.A;
          document.getElementById("scoreB").textContent = scores.B;
          document.getElementById("scoreC").textContent = scores.C;
        }

        function checkWinner() {
          const limitInput = document.getElementById("scoreLimit").value;
          const limit = validateInput(limitInput, 10, 1000, "Score limite");
          if (limit === null) {
            document.getElementById("scoreLimit").value = 100; // Valeur par défaut
            return;
          }
          
          for(let p of ['A','B','C']){
            if(scores[p] >= limit){
              document.getElementById("winnerBox").innerHTML = "🎉 Joueur " + p + " a gagné ! 🎉";
              gameFinished = true;
              sendMessage("GAME_FINISHED", {
                data: { scores, winner: p, scoreLimit: limit }
              });
              break;
            }
          }
        }

        inputElement.onchange = (e) => {
          if (!e.target.files || !e.target.files[0]) return;
          
          const file = e.target.files[0];
          // Valider la taille du fichier (max 10MB)
          if (file.size > 10 * 1024 * 1024) {
            showError("L'image est trop grande. Maximum 10MB.");
            return;
          }

          const reader = new FileReader();
          reader.onload = (event) => {
            imgElement.src = event.target.result;
            imgElement.style.display = "block";
            if (imageContainer) imageContainer.style.display = "block";
          };
          reader.onerror = () => {
            showError("Erreur lors de la lecture de l'image.");
          };
          reader.readAsDataURL(file);
        };

        // =================== ALGO OPEN-CV ===================
        imgElement.onload = async function () {
          if(gameFinished || isProcessing) return;
          
          isProcessing = true;
          // Ne pas afficher le loader
          // loader.classList.add("active");
          sendMessage("PROCESSING_START", {});

          try {
            // Attendre qu'OpenCV soit chargé avec timeout
            if (typeof cv === 'undefined') {
              await new Promise((resolve, reject) => {
                let attempts = 0;
                const maxAttempts = 50; // 5 secondes max (50 * 100ms)
                const checkCV = setInterval(() => {
                  attempts++;
                  if (typeof cv !== 'undefined' && cv && cv.Mat) {
                    clearInterval(checkCV);
                    resolve(true);
                  } else if (attempts >= maxAttempts) {
                    clearInterval(checkCV);
                    reject(new Error("OpenCV.js n'a pas pu être chargé dans le délai imparti"));
                  }
                }, 100);
              });
            }

            cv = cv instanceof Promise ? await cv : cv;

            let src, gray, dominoThresh, kernel, contours, hierarchy;
            
            try {
              src = cv.imread(imgElement);
              
              // Redimensionner si l'image est trop grande (optimisation)
              const maxWidth = 800;
              if (src.cols > maxWidth) {
                const ratio = maxWidth / src.cols;
                const newWidth = maxWidth;
                const newHeight = Math.floor(src.rows * ratio);
                const dsize = new cv.Size(newWidth, newHeight);
                const resized = new cv.Mat();
                cv.resize(src, resized, dsize);
                src.delete();
                src = resized;
              }

              gray = new cv.Mat();
              cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
              cv.GaussianBlur(gray, gray, new cv.Size(5, 5), 0);

              dominoThresh = new cv.Mat();
              cv.adaptiveThreshold(gray, dominoThresh, 255, cv.ADAPTIVE_THRESH_MEAN_C, cv.THRESH_BINARY, 21, -10);
              kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(5, 5));
              cv.morphologyEx(dominoThresh, dominoThresh, cv.MORPH_CLOSE, kernel);

              contours = new cv.MatVector();
              hierarchy = new cv.Mat();
              cv.findContours(dominoThresh, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

              let grandTotal = 0;
              let detectedDominos = [];

              // Fonction améliorée de filtrage des cercles - plus permissive pour détecter plus de pips
              function filterCircles(circles, minDist, minRadius = 3, maxRadius = 50) {
                let filtered = [];
                let candidates = [];
                
                // Extraire tous les cercles candidats avec validation de taille
                for (let i = 0; i < circles.cols; i++) {
                  let x = circles.data32F[i*3];
                  let y = circles.data32F[i*3+1];
                  let radius = circles.data32F[i*3+2];
                  
                  // Validation de la taille (plus permissive)
                  if (radius >= minRadius && radius <= maxRadius) {
                    candidates.push({x, y, radius});
                  }
                }
                
                // Trier par rayon (les plus grands en premier pour prioriser)
                candidates.sort((a, b) => b.radius - a.radius);
                
                // Filtrer les cercles trop proches (garder le plus grand)
                for (let c of candidates) {
                  let tooClose = false;
                  for (let f of filtered) {
                    let dx = c.x - f.x;
                    let dy = c.y - f.y;
                    let dist = Math.sqrt(dx*dx + dy*dy);
                    // Distance minimale adaptative basée sur les rayons
                    let adaptiveMinDist = Math.max(minDist, (c.radius + f.radius) * 0.8);
                    if (dist < adaptiveMinDist) {
                      tooClose = true;
                      break;
                    }
                  }
                  if (!tooClose) {
                    filtered.push(c);
                  }
                }
                
                return filtered;
              }

              // Traitement des contours avec gestion d'erreurs - version améliorée mais permissive
              for(let i=0;i<contours.size();i++){
                let cnt, mask, cvContours, thresh, kernel2, masked, left, right, leftCircles, rightCircles;
                
                try {
                  cnt = contours.get(i);
                  if(cv.contourArea(cnt)<1000) continue;

                  let rect = cv.boundingRect(cnt);
                  let aspectRatio = rect.width/rect.height;
                  if(aspectRatio>1.5 || aspectRatio<0.66) {
                    // C'est probablement un domino
                  } else {
                    continue;
                  }

                  mask = cv.Mat.zeros(gray.rows, gray.cols, cv.CV_8UC1);
                  cvContours = new cv.MatVector();
                  cvContours.push_back(cnt);
                  cv.drawContours(mask, cvContours, 0, new cv.Scalar(255), -1);
                  cvContours.delete();

                  // Amélioration : essayer plusieurs méthodes de seuillage pour détecter plus de pips
                  thresh = new cv.Mat();
                  cv.adaptiveThreshold(gray, thresh, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 11, 2);
                  kernel2 = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(3,3));
                  cv.morphologyEx(thresh, thresh, cv.MORPH_OPEN, kernel2);

                  masked = new cv.Mat();
                  cv.bitwise_and(thresh, mask, masked);

                  let halfWidth = Math.floor(rect.width/2);
                  left = masked.roi(new cv.Rect(rect.x, rect.y, halfWidth, rect.height)).clone();
                  right = masked.roi(new cv.Rect(rect.x+halfWidth, rect.y, rect.width-halfWidth, rect.height)).clone();

                  // Calculer les paramètres adaptatifs basés sur la taille du domino
                  let regionSize = Math.min(halfWidth, rect.height);
                  let minRadius = Math.max(3, Math.floor(regionSize / 20)); // Plus petit pour détecter plus
                  let maxRadius = Math.min(30, Math.floor(regionSize / 3));
                  let minDist = Math.max(10, Math.floor(minRadius * 1.5)); // Distance minimale adaptative
                  
                  leftCircles = new cv.Mat();
                  rightCircles = new cv.Mat();
                  
                  // Essayer avec plusieurs paramètres pour maximiser la détection
                  // Paramètres initiaux (équilibrés)
                  let param1 = 100; // Seuil supérieur pour la détection de bord
                  let param2 = 15;  // Seuil pour la détection de centre (plus bas = plus de cercles détectés)
                  
                  cv.HoughCircles(left, leftCircles, cv.HOUGH_GRADIENT, 1, minDist, param1, param2, minRadius, maxRadius);
                  cv.HoughCircles(right, rightCircles, cv.HOUGH_GRADIENT, 1, minDist, param1, param2, minRadius, maxRadius);
                  
                  // Si peu de cercles détectés, essayer avec paramètres plus permissifs
                  if(leftCircles.cols + rightCircles.cols < 2) {
                    param2 = 10; // Encore plus permissif
                    let leftCircles2 = new cv.Mat();
                    let rightCircles2 = new cv.Mat();
                    cv.HoughCircles(left, leftCircles2, cv.HOUGH_GRADIENT, 1, minDist, param1, param2, minRadius, maxRadius);
                    cv.HoughCircles(right, rightCircles2, cv.HOUGH_GRADIENT, 1, minDist, param1, param2, minRadius, maxRadius);
                    
                    // Combiner les résultats (garder le meilleur de chaque)
                    if(leftCircles2.cols > leftCircles.cols) {
                      leftCircles.delete();
                      leftCircles = leftCircles2;
                    } else {
                      leftCircles2.delete();
                    }
                    if(rightCircles2.cols > rightCircles.cols) {
                      rightCircles.delete();
                      rightCircles = rightCircles2;
                    } else {
                      rightCircles2.delete();
                    }
                  }

                  // Filtrer les cercles avec paramètres adaptatifs
                  let leftFiltered = filterCircles(leftCircles, minDist, minRadius, maxRadius);
                  let rightFiltered = filterCircles(rightCircles, minDist, minRadius, maxRadius);
                  
                  // Limiter à 6 pips par côté (maximum d'un domino)
                  leftFiltered = leftFiltered.slice(0, 6);
                  rightFiltered = rightFiltered.slice(0, 6);

                  // Dessin des pips
                  for(let c of leftFiltered) {
                    cv.circle(src, new cv.Point(c.x+rect.x,c.y+rect.y), c.radius, [255,0,0,255],3);
                  }
                  for(let c of rightFiltered) {
                    cv.circle(src, new cv.Point(c.x+rect.x+halfWidth,c.y+rect.y), c.radius, [0,0,255,255],3);
                  }

                  let leftScore = leftFiltered.length;
                  let rightScore = rightFiltered.length;
                  grandTotal += leftScore+rightScore;
                  
                  if(leftScore > 0 || rightScore > 0) {
                    detectedDominos.push({
                      left: leftScore,
                      right: rightScore,
                      rect: rect
                    });
                  }

                  // Nettoyage de la mémoire
                  left.delete(); 
                  right.delete(); 
                  masked.delete(); 
                  mask.delete(); 
                  thresh.delete(); 
                  kernel2.delete();
                  leftCircles.delete(); 
                  rightCircles.delete();
                } catch (err) {
                  console.error("Erreur lors du traitement d'un contour:", err);
                  // Nettoyage en cas d'erreur
                  if (cnt) cnt = null;
                  if (mask) { mask.delete(); mask = null; }
                  if (thresh) { thresh.delete(); thresh = null; }
                  if (masked) { masked.delete(); masked = null; }
                  if (left) { left.delete(); left = null; }
                  if (right) { right.delete(); right = null; }
                  if (leftCircles) { leftCircles.delete(); leftCircles = null; }
                  if (rightCircles) { rightCircles.delete(); rightCircles = null; }
                  continue;
                }
              }

              cv.imshow("canvasOutput", src);
              
              // Afficher le conteneur d'image et le canvas
              if (imageContainer) imageContainer.style.display = "block";
              canvas.style.display = "block";
              imgElement.style.display = "block";

              // Nettoyage final
              src.delete(); 
              gray.delete(); 
              dominoThresh.delete(); 
              kernel.delete(); 
              contours.delete(); 
              hierarchy.delete();

              if(grandTotal>0){
                scores[currentPlayer] += grandTotal;
                updateScoreDisplay();
                checkWinner();
                
                document.getElementById("totalPips").innerHTML = "✅ <span style='font-size: 1.3em;'>" + grandTotal + " pips</span> → <span style='color: #007bff; font-weight: bold;'>J" + currentPlayer + "</span>";
                
                sendMessage("SAVE_SCORES", {
                  data: { 
                    scores, 
                    currentPlayer, 
                    scoreLimit: parseInt(document.getElementById("scoreLimit").value), 
                    gameFinished 
                  }
                });
              }else{
                document.getElementById("totalPips").innerHTML = "⚠️ <span style='color: #dc3545;'>Aucun domino détecté</span>";
              }
            } catch (error) {
              console.error("Erreur OpenCV:", error);
              showError("Erreur lors du traitement de l'image. Veuillez réessayer.");
            } finally {
              isProcessing = false;
              // Ne pas afficher le loader
              // loader.classList.remove("active");
              sendMessage("PROCESSING_END", {});
            }
          } catch (error) {
            console.error("Erreur générale:", error);
            showError("Erreur lors du chargement d'OpenCV. Vérifiez votre connexion.");
            isProcessing = false;
            // Ne pas afficher le loader
            // loader.classList.remove("active");
            sendMessage("PROCESSING_END", {});
          }
        };

        // Variable pour suivre le chargement d'OpenCV depuis le CDN
        let opencvCheckInterval = null;
        let opencvTimeout = null;

        // Fonction pour vérifier si OpenCV est chargé
        function checkOpenCVLoaded() {
          if (typeof cv !== 'undefined' && cv && cv.Mat) {
            if (opencvCheckInterval) {
              clearInterval(opencvCheckInterval);
              opencvCheckInterval = null;
            }
            if (opencvTimeout) {
              clearTimeout(opencvTimeout);
              opencvTimeout = null;
            }
            // Masquer le message de statut
            document.getElementById("status").style.display = "none";
            sendMessage("OPENCV_READY", {});
            return true;
          }
          return false;
        }

        // Vérifier périodiquement si OpenCV est chargé depuis le CDN (fallback)
        opencvCheckInterval = setInterval(() => {
          if (checkOpenCVLoaded()) {
            return;
          }
        }, 500);

        // Timeout après 20 secondes - forcer le masquage du loader même si OpenCV n'est pas chargé
        opencvTimeout = setTimeout(() => {
          if (opencvCheckInterval) {
            clearInterval(opencvCheckInterval);
            opencvCheckInterval = null;
          }
          if (!checkOpenCVLoaded()) {
            // Masquer le message de statut
            document.getElementById("status").style.display = "none";
            sendMessage("OPENCV_READY", {}); // Forcer le masquage du loader
          }
        }, 20000);

        // Notification quand OpenCV est prêt depuis le CDN (méthode principale)
        var Module = { 
          onRuntimeInitialized() { 
            if (opencvCheckInterval) {
              clearInterval(opencvCheckInterval);
              opencvCheckInterval = null;
            }
            if (opencvTimeout) {
              clearTimeout(opencvTimeout);
              opencvTimeout = null;
            }
            // Masquer le message de statut
            document.getElementById("status").style.display = "none";
            sendMessage("OPENCV_READY", {});
          },
          onRuntimeInitializedError(error) {
            if (opencvCheckInterval) {
              clearInterval(opencvCheckInterval);
              opencvCheckInterval = null;
            }
            if (opencvTimeout) {
              clearTimeout(opencvTimeout);
              opencvTimeout = null;
            }
            console.error("Erreur lors de l'initialisation d'OpenCV depuis le CDN:", error);
            document.getElementById("status").innerHTML = "❌ Erreur lors du chargement d'OpenCV.js depuis le CDN";
            sendMessage("ERROR", { error: "Erreur lors du chargement d'OpenCV.js depuis le CDN: " + (error?.message || "Erreur inconnue") });
            // Forcer le masquage du loader après 2 secondes
            setTimeout(() => {
              sendMessage("OPENCV_READY", {});
            }, 2000);
          }
        };

        // Écouter les messages de React Native
        window.addEventListener("message", function(event) {
          try {
            const message = JSON.parse(event.data);
            if (message.type === "WEBVIEW_READY") {
              sendMessage("WEBVIEW_LOADED", {});
            }
          } catch (e) {
            // Ignorer les erreurs de parsing
          }
        });
      })();
    </script>
  </body>
  </html>
  `;

  const handleWebViewLoad = () => {
    // setWebViewLoaded(true);
    // Envoyer un message au WebView pour confirmer le chargement
    setTimeout(() => {
      webViewRef.current?.postMessage(
        JSON.stringify({ type: "WEBVIEW_READY" })
      );
    }, 500);
  };

  const handleRetry = () => {
    setLoadError(null);
    setIsLoading(true);
    setOpencvReady(false);
    // Recharger le WebView
    webViewRef.current?.reload();
  };

  return (
    <View style={styles.container}>
      {isLoading && !opencvReady && (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#007bff" />
          <Text style={styles.loaderText}>Chargement d&apos;OpenCV.js...</Text>
          <Text style={styles.loaderSubtext}>
            Cela peut prendre quelques secondes
          </Text>
          {loadError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{loadError}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={handleRetry}
              >
                <Text style={styles.retryButtonText}>Réessayer</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
      <WebView
        ref={(ref) => {
          webViewRef.current = ref;
          if (setWebViewRef) setWebViewRef(ref);
        }}
        style={styles.webview}
        originWhitelist={["*"]}
        source={{ html }}
        javaScriptEnabled={true}
        onMessage={handleMessage}
        onLoad={handleWebViewLoad}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error("Erreur WebView:", nativeEvent);
          setLoadError("Erreur lors du chargement de l'application");
          setIsLoading(false);
        }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error("Erreur HTTP WebView:", nativeEvent);
          setLoadError("Erreur de connexion. Vérifiez votre réseau.");
          setIsLoading(false);
        }}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#007bff" />
            <Text style={styles.loaderText}>Chargement...</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: "#f0f2f5",
  },
  loaderContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  loaderText: {
    marginTop: 10,
    fontSize: 16,
    color: "#007bff",
    fontWeight: "600",
  },
  loaderSubtext: {
    marginTop: 8,
    fontSize: 12,
    color: "#6c757d",
  },
  errorContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: "#fff3cd",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ffc107",
    maxWidth: "80%",
  },
  errorText: {
    color: "#856404",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: "#007bff",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: "center",
  },
  retryButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
});
