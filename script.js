// script.js
document.addEventListener("DOMContentLoaded", () => {
  const card = document.getElementById("roblox-card");
  if (!card) return;

  const userId = card.dataset.userId?.trim();
  if (!userId) {
    showError("Roblox kullanıcı ID'si tanımlı değil.");
    return;
  }

  const usernameEl = document.getElementById("username");
  const avatarImg = document.getElementById("avatar-img");
  const presenceEl = document.getElementById("presence");
  const profileBtn = document.getElementById("profile-btn");
  const groupNameEl = document.getElementById("group-name");
  const gameNameEl = document.getElementById("game-name");
  const groupsListEl = document.getElementById("groups-list");
  const errorEl = document.getElementById("card-error");

  // Helper: show error
  function showError(msg) {
    if (errorEl) {
      errorEl.style.display = "block";
      errorEl.textContent = msg;
    }
  }

  // Fetch basic user info
  async function fetchUser(userId) {
    const url = `https://users.roblox.com/v1/users/${userId}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Kullanıcı bilgisi alınamadı.");
    return res.json();
  }

  // Fetch avatar thumbnail (circular)
  async function fetchAvatar(userId, size = 150) {
    const url = `https://thumbnails.roblox.com/v1/users/avatar?userIds=${userId}&size=${size}x${size}&format=Png&isCircular=true`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Avatar alınamadı.");
    const data = await res.json();
    return data.data && data.data[0] ? data.data[0].imageUrl : null;
  }

  // Fetch groups and roles for user
  async function fetchGroups(userId) {
    const url = `https://groups.roblox.com/v2/users/${userId}/groups/roles`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Gruplar alınamadı.");
    return res.json(); // .data -> array
  }

  // Fetch presence (online / in game)
  async function fetchPresence(userId) {
    const url = `https://presence.roblox.com/v1/presence/users?userIds=${userId}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Durum bilgisi alınamadı.");
    const data = await res.json();
    return data.userPresences && data.userPresences[0] ? data.userPresences[0] : null;
  }

  // Fill card with fetched data
  async function fillCard(id) {
    try {
      usernameEl.textContent = "Yükleniyor...";
      presenceEl.textContent = "Yükleniyor";
      presenceEl.className = "offline";

      const [user, avatarUrl, groupsResp, presence] = await Promise.allSettled([
        fetchUser(id),
        fetchAvatar(id, 150),
        fetchGroups(id),
        fetchPresence(id)
      ]);

      // user
      if (user.status === "fulfilled") {
        usernameEl.textContent = user.value.displayName || user.value.name || `ID: ${id}`;
        profileBtn.href = `https://www.roblox.com/users/${id}/profile`;
      } else {
        usernameEl.textContent = `ID: ${id}`;
        console.warn(user.reason);
      }

      // avatar
      if (avatarUrl.status === "fulfilled" && avatarUrl.value) {
        avatarImg.src = avatarUrl.value;
      } else {
        // keep local fallback avatar in assets
        console.warn("Avatar alınamadı:", avatarUrl.reason);
      }

      // groups
      if (groupsResp.status === "fulfilled" && Array.isArray(groupsResp.value.data)) {
        const groups = groupsResp.value.data;
        if (groups.length > 0) {
          // Show primary group (first) and list others
          groupNameEl.textContent = groups[0].group.name || "—";
          groupsListEl.innerHTML = `<strong>Gruplar:</strong><ul style="margin-top:8px;">${groups.map(g => `<li>${escapeHtml(g.group.name)} — Rol: ${escapeHtml(g.role.name)}</li>`).join("")}</ul>`;
        } else {
          groupNameEl.textContent = "Bulunamadı";
          groupsListEl.innerHTML = `<em style="opacity:.8">Kullanıcı herhangi bir gruba ait değil veya gizli.</em>`;
        }
      } else {
        console.warn("Gruplar alınamadı:", groupsResp.reason);
      }

      // presence
      if (presence.status === "fulfilled" && presence.value) {
        const p = presence.value;
        // presenceType can be 0 offline, 1 online, 2 in-game (Roblox may vary)
        // presence object often has 'userPresenceType' and 'placeId'/'rootPlaceId'/'universeId'
        const isOnline = p.userPresenceType && p.userPresenceType !== 0;
        if (isOnline) {
          // if placeId/universeId available, show in-game
          if (p.placeId || p.universeId) {
            presenceEl.textContent = "Oyunda";
            presenceEl.className = "online";
            // fetch place name optionally (skipped to keep simple)
            const placeId = p.placeId || p.rootPlaceId || null;
            if (placeId) {
              gameNameEl.textContent = `Place ID: ${placeId}`;
              // optionally we could fetch place details, but skipped (CORS ok usually)
            } else {
              gameNameEl.textContent = "Oynanıyor";
            }
          } else {
            presenceEl.textContent = "Çevrimiçi";
            presenceEl.className = "online";
            gameNameEl.textContent = "—";
          }
        } else {
          presenceEl.textContent = "Çevrimdışı";
          presenceEl.className = "offline";
          gameNameEl.textContent = "—";
        }
      } else {
        console.warn("Presence alınamadı:", presence.reason);
      }

    } catch (err) {
      console.error(err);
      showError("Veri alınırken hata oluştu. Konsolu kontrol et.");
    }
  }

  // small helper to escape html
  function escapeHtml(s) {
    if (!s) return "";
    return String(s).replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[m]));
  }

  fillCard(userId);

  // small hover glow for buttons
  const buttons = document.querySelectorAll(".animated-button");
  buttons.forEach(btn => {
    btn.addEventListener("mouseover", () => {
      btn.style.boxShadow = "0 0 20px red";
    });
    btn.addEventListener("mouseout", () => {
      btn.style.boxShadow = "";
    });
  });
});
