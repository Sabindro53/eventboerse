<?php
// service-erstellen.php – Seite für Dienstleister zum Präsentieren ihres Services
include 'header.php';
?>
<main class="page active" id="page-create-service">
  <div class="container container-sm">
    <h1>Service präsentieren</h1>
    <p class="create-subtitle">Du bist Dienstleister? Stelle hier kostenlos dein Angebot vor und erreiche Eventplaner und neue Kunden!</p>
    <form action="" method="post" class="service-form">
      <label for="service-title">Service-Titel*</label>
      <input type="text" id="service-title" name="service-title" required>

      <label for="service-category">Kategorie*</label>
      <select id="service-category" name="service-category" required>
        <option value="">Bitte wählen</option>
        <option value="catering">Catering</option>
        <option value="technik">Technik</option>
        <option value="musik">Musik</option>
        <option value="deko">Dekoration</option>
        <option value="sonstiges">Sonstiges</option>
      </select>

      <label for="service-location">Einsatzgebiet*</label>
      <input type="text" id="service-location" name="service-location" required>

      <label for="service-description">Beschreibung*</label>
      <textarea id="service-description" name="service-description" rows="5" required></textarea>

      <button type="submit">Service präsentieren</button>
    </form>
  </div>
</main>
<?php
include 'footer.php';
?>
