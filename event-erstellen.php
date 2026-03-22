<?php
// event-erstellen.php – Seite für Eventplaner zum Erstellen eines Events
include 'header.php';
?>
<main class="page active" id="page-create-event">
  <div class="container container-sm">
    <h1>Event inserieren</h1>
    <p class="create-subtitle">Du bist Eventplaner? Präsentiere hier kostenlos dein Event und finde die passenden Dienstleister und Gäste!</p>
    <form action="" method="post" class="event-form">
      <label for="event-title">Event-Titel*</label>
      <input type="text" id="event-title" name="event-title" required>

      <label for="event-date">Datum*</label>
      <input type="date" id="event-date" name="event-date" required>

      <label for="event-location">Ort*</label>
      <input type="text" id="event-location" name="event-location" required>

      <label for="event-description">Beschreibung*</label>
      <textarea id="event-description" name="event-description" rows="5" required></textarea>

      <label for="event-category">Kategorie</label>
      <select id="event-category" name="event-category">
        <option value="">Bitte wählen</option>
        <option value="konzert">Konzert</option>
        <option value="messe">Messe</option>
        <option value="hochzeit">Hochzeit</option>
        <option value="geburtstag">Geburtstag</option>
        <option value="sonstiges">Sonstiges</option>
      </select>

      <button type="submit">Event inserieren</button>
    </form>
  </div>
</main>
<?php
include 'footer.php';
?>
