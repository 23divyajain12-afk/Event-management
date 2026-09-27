import mongoose from "mongoose";

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function resolveSrvViaDoh(host) {
  try {
    const res = await fetch(`https://dns.google/resolve?name=_mongodb._tcp.${host}&type=SRV`, {
      cache: "no-store",
    });
    const json = await res.json();
    if (json && Array.isArray(json.Answer) && json.Answer.length > 0) {
      return json.Answer.map((a) => {
        const parts = String(a.data || "").trim().split(/\s+/);
        const port = parts[2] || "27017";
        const hostname = (parts[3] || "").replace(/\.$/, "");
        return `${hostname}:${port}`;
      }).filter((h) => !h.startsWith(":"));
    }
  } catch (err) {
    console.warn("DoH SRV resolution error:", err.message);
  }
  return null;
}

async function resolveTxtViaDoh(host) {
  try {
    const res = await fetch(`https://dns.google/resolve?name=${host}&type=TXT`, {
      cache: "no-store",
    });
    const json = await res.json();
    if (json && Array.isArray(json.Answer) && json.Answer.length > 0) {
      const txt = json.Answer[0].data.replace(/^"|"$/g, "");
      return txt;
    }
  } catch (err) {
    console.warn("DoH TXT resolution error:", err.message);
  }
  return "authSource=admin";
}

async function dbConnect() {
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    throw new Error(
      "Please define the MONGODB_URI environment variable inside .env.local"
    );
  }

  if (cached.conn) {
    console.log("✅ Using existing database connection");
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    console.log("🔄 Connecting to MongoDB Atlas...");
    let targetUri = MONGODB_URI;

    if (MONGODB_URI.startsWith("mongodb+srv://")) {
      try {
        const hostPart = MONGODB_URI.split("@")[1]?.split("/")[0]?.split("?")[0];
        if (hostPart) {
          const hosts = await resolveSrvViaDoh(hostPart);
          const txtParams = await resolveTxtViaDoh(hostPart);
          if (hosts && hosts.length > 0) {
            const authPart = MONGODB_URI.slice("mongodb+srv://".length, MONGODB_URI.indexOf("@"));
            const pathQuery = MONGODB_URI.slice(MONGODB_URI.indexOf("@") + 1 + hostPart.length);
            const connector = pathQuery.includes("?") ? "&" : "?";
            targetUri = `mongodb://${authPart}@${hosts.join(",")}${pathQuery}${connector}${txtParams}&ssl=true`;
            console.log("✅ Auto-resolved SRV & replicaSet parameters via Google DoH");
          }
        }
      } catch (dnsErr) {
        console.warn("⚠️ DNS auto-resolve warning:", dnsErr.message);
      }
    }

    cached.promise = mongoose.connect(targetUri, opts).then((mongoose) => {
      console.log("✅ MongoDB Atlas connected successfully");
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    console.error("❌ MongoDB connection error:", e.message);
    throw e;
  }

  return cached.conn;
}

export default dbConnect;
