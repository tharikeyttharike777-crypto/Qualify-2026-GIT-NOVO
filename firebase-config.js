console.log("🔌 INICIANDO PROTOCOLO DE CONEXÃO FIREBASE...");

// 1. CONFIGURAÇÃO (Mantenha suas chaves originais aqui!)
const firebaseConfig = {
    apiKey: "AIzaSyAZR5KhECcpltS1B_L3L2Oqdxerk8Jq6uY",
    authDomain: "progemello.firebaseapp.com",
    projectId: "progemello",
    storageBucket: "progemello.firebasestorage.app",
    messagingSenderId: "704109708512",
    appId: "1:704109708512:web:a2cbb6a0c4a6fddc767c85"
};

// 2. INICIALIZAÇÃO BLINDADA (Compatibilidade V8)
if (!firebase.apps.length) {
    try {
        firebase.initializeApp(firebaseConfig);
        console.log("✅ App Firebase Inicializado.");
    } catch (e) {
        console.error("❌ Erro fatal na init:", e);
    }
} else {
    firebase.app(); // Usa instância existente
}

// 3. REFERÊNCIAS GLOBAIS
const db = firebase.firestore();
const auth = firebase.auth();
const storage = firebase.storage ? firebase.storage() : null;

// Disponibilizar globalmente (Importante para outros scripts que esperam window.db)
window.db = db;
window.auth = auth;
window.storage = storage;
window.firebase = firebase;

// 4. FORÇAR PERSISTÊNCIA E LOGS
firebase.firestore.setLogLevel('debug'); // Vai mostrar no console se falhar
