<%- include('../partials/head', { title }) %>
<%- include('../partials/header') %>
<main class="page narrow">
  <article class="article">
    <a class="back" href="/">← Kembali</a>
    <h1><%= post.title %></h1>
    <% if (post.thumb || post.image) { %>
      <img class="article-img" src="<%= post.thumb || post.image %>" alt="<%= post.title %>" onerror="this.style.display='none'">
    <% } %>
    <div class="article-content">
      <%- post.contentHtml || '<p>Belum ada keterangan.</p>' %>
    </div>
  </article>
</main>
<%- include('../partials/footer') %>
