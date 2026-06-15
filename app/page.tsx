"use client";

import {
  GoogleMap,
  Marker,
  InfoWindow,
  useJsApiLoader,
} from "@react-google-maps/api";

import { useState, useEffect } from "react";

import { db, auth, provider } from "@/lib/firebase";

import {
  doc,
  setDoc,
  getDoc,
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
    password: "SU2024",
    funFact: "The Union is a great place to socialize and get food not from the dining hall",
  },
  {
    id: 2,
    name: "DCC Cache",
    lat: 42.729446,
    lng: -73.679248,
    points: 2,
    difficulty: "medium",
    password: "DCC404",
    funFact: "SKI, LXA, and SigChi are the best frats at RPI",
  },
  {
    id: 3,
    name: "ArchE Cache",
    lat: 42.730073,
    lng: -73.681175,
    points: 2,
    difficulty: "hard",
    password: "ARCHE22",
    funFact: "Greene is the only building open 24 hrs",
  },
  {
    id: 4,
    name: "Folsom Library Cache",
    lat: 42.729383,
    lng: -73.682550,
    points: 2,
    difficulty: "easy",
    password: "ALAC99",
    funFact: "The first floor of the library is where students can get tutored for free!",
  },
  {
    id: 5,
    name: "BBALL Cache",
    lat: 42.727428,
    lng: -73.675388,
    points: 2,
    difficulty: "easy",
    password: "RPIHOOPS",
    funFact: "If you go behind the basketball court and down to Bouton road, its a shortcut to Big Apple Pizza (Bapple)",
  },
  {
    id: 6,
    name: "Queen of Mueller Cache",
    lat: 42.728789,
    lng: -73.676934,
    points: 2,
    difficulty: "blue",
    password: "MUELLER6",
    funFact: "Mueller hosts fitness classes every week and hosts Wellness Wednesdays!",
  },
  {
    id: 7,
    name: "Quad Cache",
    lat: 42.730163,
    lng: -73.677643,
    points: 2,
    difficulty: "hard",
    password: "QUAD777",
    funFact: "If you take the West Shuttle from the Union, it drops you off in front of Gong Cha!",
  },
  {
    id: 8,
    name: "Amos Eaton Cache",
    lat: 42.730276,
    lng: -73.682547,
    points: 2,
    difficulty: "blue",
    password: "AMOS2024",
    funFact: "Amos Eaton has a Computer Science lounge on the first floor",
  },
  {
    id: 9,
    name: "Sage Cache",
    lat: 42.730891,
    lng: -73.681637,
    points: 2,
    difficulty: "medium",
    password: "RUSSELL",
    funFact: "There are great study spots on the 4th and 5th floor of Sage",
  },
  {
    id: 10,
    name: "Ricketts Cache",
    lat: 42.730921,
    lng: -73.679804,
    points: 2,
    difficulty: "blue",
    password: "Marty",
    funFact: "The club you least expect to join might become your favorite part of college.",
  },
];

/* ---------------- MARKERS ---------------- */

const getMarkerIcon = (difficulty: string) => {
  if (difficulty === "easy")
    return "http://maps.google.com/mapfiles/ms/icons/green-dot.png";
  if (difficulty === "blue")
    return "http://maps.google.com/mapfiles/ms/icons/blue-dot.png";
  if (difficulty === "medium")
    return "http://maps.google.com/mapfiles/ms/icons/yellow-dot.png";
  return "http://maps.google.com/mapfiles/ms/icons/red-dot.png";
};

/* ---------------- APP ---------------- */

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [selectedCache, setSelectedCache] = useState<any>(null);
  const [completedCaches, setCompletedCaches] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [unlockedFunFact, setUnlockedFunFact] = useState<string | null>(null);

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
        alert("Popup blocked. Please allow popups and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  /* ---------------- PASSWORD CHECK ---------------- */

  const handlePasswordSubmit = async () => {
    if (!selectedCache || !user) return;

    if (passwordInput.trim().toUpperCase() === selectedCache.password.toUpperCase()) {
      setUnlockedFunFact(selectedCache.funFact);
      setPasswordError(false);

      if (!completedCaches.includes(selectedCache.id)) {
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);
        const current = snap.exists() ? snap.data().totalPoints || 0 : 0;
        const updated = [...completedCaches, selectedCache.id];

        await setDoc(
          userRef,
          {
            name: user.displayName,
            email: user.email,
            totalPoints: current + selectedCache.points,
            completedCaches: updated,
          },
          { merge: true }
        );

        setCompletedCaches(updated);
      }
    } else {
      setPasswordError(true);
      setUnlockedFunFact(null);
    }
  };

  const handleMarkerClick = (cache: any) => {
    setSelectedCache(cache);
    setPasswordInput("");
    setPasswordError(false);
    setUnlockedFunFact(null);
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
            backgroundImage: "url('/cache_background.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            position: "relative",
          }}
        >
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} />

          <div
            style={{
              position: "relative",
              background: "rgba(255,255,255,0.95)",
              padding: "32px 24px",
              borderRadius: "20px",
              width: "90%",
              maxWidth: "340px",
              textAlign: "center",
              zIndex: 1,
              color: "black",
              boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
            }}
          >
            <p style={{ fontSize: "2rem", margin: "0 0 4px 0" }}>📍</p>
            <h1 style={{ fontSize: "1.8rem", fontWeight: 900, margin: "0 0 4px 0" }}>
              Cache404
            </h1>
            <p style={{ fontSize: "0.85rem", color: "#666", margin: "0 0 24px 0" }}>
              RPI × GDG Geocaching Game
            </p>

            <button
              onClick={login}
              disabled={loading}
              style={{
                width: "100%",
                padding: "12px",
                background: loading ? "#999" : "#4285F4",
                color: "white",
                border: "none",
                borderRadius: "10px",
                cursor: loading ? "not-allowed" : "pointer",
                fontWeight: "bold",
                fontSize: "0.95rem",
              }}
            >
              {loading ? "Signing in..." : "Sign in with Google"}
            </button>

            <p style={{ marginTop: "16px", fontSize: "0.75rem", color: "#aaa" }}>
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
            Welcome {user.displayName}!
            <br />
            <button
            onClick={logout}
            style={{
              marginTop: "6px",
              padding: "6px 14px",
              background: "#ef4444",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "0.85rem",
            }}
          >
            Logout
          </button>
          </div>
          <div
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                zIndex: 10,
                background: "#fef9c3",
                padding: "6px 10px",
                borderRadius: "8px",
                color: "#854d0e",
                fontWeight: "bold",
                fontSize: "0.7rem",
                borderLeft: "3px solid #eab308",
                maxWidth: "140px",
              }}
            >
              🏆 Return to the Union at 4:00 for prizes!
            </div>

          {/* MAP */}
          {isLoaded && (
            <GoogleMap mapContainerStyle={containerStyle} center={center} zoom={14}>
              {caches.map((cache) => (
                <Marker
                  key={cache.id}
                  position={{ lat: cache.lat, lng: cache.lng }}
                  icon={{ url: getMarkerIcon(cache.difficulty) }}
                  onClick={() => handleMarkerClick(cache)}
                />
              ))}

              {selectedCache && (
                <InfoWindow
                  position={{ lat: selectedCache.lat, lng: selectedCache.lng }}
                  onCloseClick={() => {
                    setSelectedCache(null);
                    setUnlockedFunFact(null);
                    setPasswordError(false);
                    setPasswordInput("");
                  }}
                >
                  <div style={{ color: "black", minWidth: "220px" }}>
                    <h3 style={{ fontWeight: 900, margin: "0 0 8px 0" }}>{selectedCache.name}</h3>

                    {completedCaches.includes(selectedCache.id) ? (
                      <div>
                        <p style={{ color: "green", fontWeight: "bold" }}>✅ Completed!</p>
                        <p style={{ fontSize: "0.85rem", fontStyle: "arial" }}>
                           {selectedCache.funFact}
                        </p>
                      </div>
                    ) : unlockedFunFact ? (
                      <div>
                        <p style={{ color: "green", fontWeight: "bold" }}>
                          🎉 +{selectedCache.points} points earned!
                        </p>
                        <p style={{ fontSize: "0.85rem", fontStyle: "italic" }}>
                          🎓 {unlockedFunFact}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p style={{ fontSize: "0.9rem", marginBottom: "8px" }}>
                          Enter the cache password:
                        </p>
                        <input
                          type="text"
                          value={passwordInput}
                          onChange={(e) => {
                            setPasswordInput(e.target.value);
                            setPasswordError(false);
                          }}
                          onKeyDown={(e) => e.key === "Enter" && handlePasswordSubmit()}
                          placeholder="Password..."
                          style={{
                            width: "100%",
                            padding: "8px",
                            borderRadius: "6px",
                            border: passwordError ? "2px solid red" : "1px solid #ccc",
                            marginBottom: "8px",
                            boxSizing: "border-box",
                          }}
                        />
                        {passwordError && (
                          <p style={{ color: "red", fontSize: "0.8rem", marginBottom: "6px" }}>
                            ❌ Wrong password, try again!
                          </p>
                        )}
                        <button
                          onClick={handlePasswordSubmit}
                          style={{
                            width: "100%",
                            padding: "8px",
                            background: "#4285F4",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontWeight: "bold",
                          }}
                        >
                          Submit
                        </button>
                      </div>
                    )}
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