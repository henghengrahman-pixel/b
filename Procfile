<%- include('../partials/head', { title }) %>
<%- include('../partials/header') %>
<main class="page">
  <section class="hero">
    <p class="eyebrow">REAL TESTIMONI</p>
    <h1>Bukti JP Member</h1>
    <p>Kumpulan bukti kemenangan terbaru.</p>
  </section>
  <% if (!posts || posts.length === 0) { %>
    <div class="empty">Belum ada data. Silakan tambah dari admin.</div>
  <% } else { %>
    <section class="grid">
      <% posts.forEach(function(post){ %>
        <article class="card">
          <% if (post.thumb || post.image) { %>
            <img src="<%= post.thumb || post.image %>" alt="<%= post.title %>" loading="lazy" onerror="this.style.display='none'">
          <% } %>
          <div class="card-body">
            <h2><%= post.title %></h2>
            <a class="btn" href="/detail/<%= post.id %>">Lihat Detail</a>
          </div>
        </article>
      <% }) %>
    </section>
  <% } %>
</main>
<%- include('../partials/footer') %>
