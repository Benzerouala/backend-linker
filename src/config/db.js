import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // Options de connexion (optionnelles avec Mongoose 6+)
      // useNewUrlParser: true,
      // useUnifiedTopology: true,
    });

    console.log(`✅ MongoDB connecté: ${conn.connection.host}`);
    console.log(`📊 Base de données: ${conn.connection.name}`);
  } catch (error) {
    console.error("❌ Erreur de connexion MongoDB:", error.message);
    process.exit(1); // Arrêter le processus en cas d'erreur
  }
};

// Gestion des événements de connexion
mongoose.connection.on("disconnected", () => {
  console.log("⚠️ MongoDB déconnecté");
});

mongoose.connection.on("error", (err) => {
  console.error("❌ Erreur MongoDB:", err);
});

export default connectDB;
