"use client";

import {
  GoogleMap,
  Marker,
  InfoWindow,
  useJsApiLoader,
} from "@react-google-maps/api";

import { useState, useRef, useEffect } from "react";

import { storage, db, auth, provider } from "@/lib/firebase";
import { ref, uploadBytes } from "firebase/storage";

import {
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  collection,
  query,
  orderBy,
} from "firebase/firestore";

import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";

/* ---------------- MAP ---------------- */

const containerStyle = {
  width: "100%",
  height: "100vh",
};

const center = {
  lat: 42.7295,
  lng: -73.6788,
};

/* ---------------- CACHES ---------------- */

const caches = [
  {
    id: 1,
    name: "Student Union Cache",
    lat: 42.729989,
    lng: -73.676679,
    points: 2,
    difficulty: "easy",
    riddle:
      "Mothers may give comfort, but I'm where students go for quick relief from hunger.",
  },
  {
    id: 2,
    name: "DCC Cache",
    lat: 42.729446,
    lng: -73.679248,
    points: 4,
    difficulty: "medium",
    riddle:
      "I am where hundreds sit in silence, in front of the DCC Cafe. Row 5 holds your path, seat 7 is where I wait.",
  },
  {
    id: 3,
    name: "ArchE Cache",
    lat: 42.730073,
    lng: -73.681175,
    points: 6,
    difficulty: "hard",
    riddle:
      "Look where green meets Greene, where shadows lean—search the quiet bushes at my front unseen.",
  },
  {
    id: 4,
    name: "ALAC Cache",
    lat: 42.729383,
    lng: -73.682550,
    points: 2,
    difficulty: "easy",
    riddle:
      "Go where help is given on the floor of study. By glass that frames downtown Troy in view, Where light meets the window—I’ll be waiting for you.",
  },
  {
    id: 5,
    name: "BBALL Cache",
    lat: 42.727428,
    lng: -73.675388,
    points: 2,
    difficulty: "easy",
    riddle: "Look in the place where Steph Curry sinks 3s",
  },
  {
    id: 6,
    name: "Queen of Mueller Cache",
    lat: 42.728789,
    lng: -73.676934,
    points: 4,
    difficulty: "medium",
    riddle: "Where a climb never ends nor reaches a floor",
  },
  {
    id: 7,
    name: "Quad Cache",
    lat: 42.730163,
    lng: -73.677643,
    points: 6,
    difficulty: "hard",
    riddle: "Find me sparkling on the door of a Church",
  },
  {
    id: 8,
    name: "Amos Eaton Cache",
    lat: 42.730276,
    lng: -73.682547,
    points: 6,
    difficulty: "hard",
    riddle:
      "In the edifice where computation theory and mathematical abstraction align, find the office where John Sturman's name lies",
  },
];

/* ---------------- STYLE ---------------- */

const difficultyMap: Record<string, { label: string; color: string }> = {
  easy: { label: "Easy", color: "green" },
  medium: { label: "Medium", color: "orange" },
  hard: { label: "Hard", color: "red" },
};

/* ---------------- MARKERS ---------------- */

const getMarkerIcon = (difficulty: string) => {
  if (difficulty === "easy")
    return "http://maps.google.com/mapfiles/ms/icons/green-dot.png";
  if (difficulty === "medium")
    return "http://maps.google.com/mapfiles/ms/icons/yellow-dot.png";
  return "http://maps.google.com/mapfiles/ms/icons/red-dot.png";
};

/* ---------------- APP ---------------- */

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [selectedCache, setSelectedCache] = useState<any>(null);
  const [completedCaches, setCompletedCaches] = useState<number[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ---------------- MAP ---------------- */

const { isLoaded } = useJsApiLoader({
  id: "google-map-script",
  googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
});

  /* ---------------- AUTH ---------------- */

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);

      if (!u) return;

      const userRef = doc(db, "users", u.uid);
      const snap = await getDoc(userRef);

      if (snap.exists()) {
        setCompletedCaches(snap.data().completedCaches || []);
      }
    });

    return () => unsub();
  }, []);

  const login = async () => {
    if (loading) return;

    setLoading(true);
    try {
      const res = await signInWithPopup(auth, provider);
      setUser(res.user);
    } catch (err: any) {
      console.error("Login error:", err);

      if (
        err.code === "auth/popup-blocked" ||
        err.code === "auth/cancelled-popup-request"
      ) {
        alert(
          "Popup blocked. Please allow popups and try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  /* ---------------- LEADERBOARD ---------------- */

  useEffect(() => {
    const q = query(
      collection(db, "users"),
      orderBy("totalPoints", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setLeaderboard(data);
    });

    return () => unsub();
  }, []);

  /* ---------------- UPLOAD ---------------- */

  const uploadProof = async (cache: any, file: File) => {
    if (!user || !file) return;

    if (completedCaches.includes(cache.id)) return;

    const storageRef = ref(
      storage,
      `proofs/${user.uid}/${cache.id}-${Date.now()}`
    );

    await uploadBytes(storageRef, file);

    const userRef = doc(db, "users", user.uid);

    const updated = [...completedCaches, cache.id];

    await setDoc(
      userRef,
      {
        name: user.displayName,
        email: user.email,
        totalPoints: cache.points,
        completedCaches: updated,
      },
      { merge: true }
    );

    setCompletedCaches(updated);
  };

  /* ---------------- UI ---------------- */

  return (
    <div>
      {!user ? (
        <div
          style={{
            height: "100vh",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            backgroundImage:
              "url('/cache_background.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.45)",
            }}
          />

          <div
            style={{
              position: "relative",
              background: "white",
              padding: "60px",
              borderRadius: "24px",
              width: "600px",
              textAlign: "center",
              zIndex: 1,
              color: "black",
              boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
            }}
          >
            <h1 style={{ fontSize: "4rem", fontWeight: 900 }}>
              📍 Cache404
            </h1>

            <p style={{ fontSize: "1.2rem" }}>
              RPI × GDG Geocaching Game
            </p>

            <button
              onClick={login}
              disabled={loading}
              style={{
                width: "100%",
                padding: "14px",
                background: loading ? "#999" : "#4285F4",
                color: "white",
                border: "none",
                borderRadius: "10px",
                cursor: loading ? "not-allowed" : "pointer",
                fontWeight: "bold",
              }}
            >
              {loading
                ? "Signing in..."
                : "Sign in with Google"}
            </button>

            <p
              style={{
                marginTop: "20px",
                fontSize: "0.9rem",
                opacity: 0.7,
              }}
            >
              Developed by Sreeja Barua
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* TOP BAR */}
          <div
            style={{
              position: "absolute",
              top: 10,
              left: 10,
              zIndex: 10,
              background: "white",
              padding: "10px",
              borderRadius: "10px",
              color: "black",
            }}
          >
            Welcome {user.displayName}
            <br />
            <button onClick={logout}>Logout</button>
          </div>

          {/* LEADERBOARD */}
          <div
            style={{
              position: "absolute",
              top: 10,
              right: 10,
              zIndex: 10,
              background: "white",
              padding: "12px",
              borderRadius: "12px",
              width: "240px",
              color: "black",
            }}
          >
            <h3>🏆 Leaderboard</h3>
            {leaderboard.slice(0, 5).map((p, i) => (
              <div key={p.id}>
                #{i + 1} {p.name || "Anon"} -{" "}
                {p.totalPoints || 0}
              </div>
            ))}
          </div>

          {/* MAP */}
          {isLoaded && (
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={center}
              zoom={16}
            >
              {caches.map((cache) => (
                <Marker
                  key={cache.id}
                  position={{
                    lat: cache.lat,
                    lng: cache.lng,
                  }}
                  icon={{
                    url: getMarkerIcon(cache.difficulty),
                  }}
                  onClick={() => setSelectedCache(cache)}
                />
              ))}

              {selectedCache && (
                <InfoWindow
                  position={{
                    lat: selectedCache.lat,
                    lng: selectedCache.lng,
                  }}
                  onCloseClick={() =>
                    setSelectedCache(null)
                  }
                >
                  <div style={{ color: "black" }}>
                    <h3>{selectedCache.name}</h3>

                    <p>{selectedCache.riddle}</p>

                    <button
                      onClick={() =>
                        fileInputRef.current?.click()
                      }
                      disabled={completedCaches.includes(
                        selectedCache.id
                      )}
                    >
                      {completedCaches.includes(
                        selectedCache.id
                      )
                        ? "Completed"
                        : "Upload Proof"}
                    </button>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          uploadProof(
                            selectedCache,
                            e.target.files[0]
                          );
                        }
                      }}
                    />
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          )}
        </>
      )}
    </div>
  );
}