export default function MentionsLegales() {
  return (
    <article>
      <h1>Mentions légales</h1>

      <h2>Éditeur du service</h2>
      <p>
        <strong>Raison sociale :</strong> Acreed IA Solutions<br />
        <strong>Forme juridique :</strong> SAS<br />
        <strong>Siège social :</strong> Lyon, France<br />
        <strong>RCS :</strong> Lyon — immatriculation en cours<br />
        <strong>Contact :</strong> <a href="mailto:contact@acreediasolutions.com">contact@acreediasolutions.com</a><br />
        <strong>Directeur de la publication :</strong> Kieran Gauthier
      </p>

      <h2>Hébergeur</h2>
      <p>
        <strong>Hébergeur applicatif :</strong> Microsoft Azure — région France Centre (Paris).<br />
        <strong>Stockage objet :</strong> MinIO auto-hébergé sur la même infrastructure.<br />
        <strong>Base de données :</strong> PostgreSQL — région France Centre (Paris).
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        L'ensemble du site et de l'application ConceptManager — arborescence, contenus, marques,
        logos, logiciels — est protégé par le Code de la propriété intellectuelle.
        Toute reproduction, représentation ou diffusion, partielle ou totale, sans autorisation
        écrite préalable, est interdite.
      </p>

      <h2>Données personnelles et cookies</h2>
      <p>
        Voir la <a href="/legal/confidentialite">politique de confidentialité</a>.
      </p>

      <h2>Logiciels libres tiers</h2>
      <p>
        ConceptManager s'appuie sur plusieurs logiciels libres, notamment :
      </p>
      <ul>
        <li>
          <a href="https://www.ghostscript.com" target="_blank" rel="noopener noreferrer">Ghostscript</a>{" "}
          (AGPL v3) — utilisé comme outil en ligne de commande pour produire les
          factures au format PDF/A-3 / Factur-X.
        </li>
        <li>
          <a href="https://nodejs.org" target="_blank" rel="noopener noreferrer">Node.js</a>,{" "}
          <a href="https://react.dev" target="_blank" rel="noopener noreferrer">React</a>,{" "}
          <a href="https://nestjs.com" target="_blank" rel="noopener noreferrer">NestJS</a>,{" "}
          <a href="https://www.prisma.io" target="_blank" rel="noopener noreferrer">Prisma</a>{" "}
          (MIT).
        </li>
        <li>
          <a href="https://www.postgresql.org" target="_blank" rel="noopener noreferrer">PostgreSQL</a>{" "}
          (PostgreSQL License).
        </li>
      </ul>
    </article>
  );
}
