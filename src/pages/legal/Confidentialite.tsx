export default function Confidentialite() {
  return (
    <article>
      <h1>Politique de confidentialité (RGPD)</h1>

      <p>
        <strong>⚠️ Gabarit non finalisé.</strong> À faire relire par un DPO avant mise en
        production commerciale.
      </p>

      <h2>1. Responsable de traitement</h2>
      <p>
        [RAISON SOCIALE], éditeur de ConceptManager.<br />
        Contact DPO : <a href="mailto:dpo@example.fr">dpo@example.fr</a> (à configurer).
      </p>

      <h2>2. Données collectées</h2>
      <ul>
        <li>
          <strong>Identification :</strong> nom, prénom, email, rôle, entité d'appartenance,
          avatar.
        </li>
        <li>
          <strong>RH :</strong> documents d'embauche, absences, heures saisies
          (base légale : contrat de travail, obligations comptables).
        </li>
        <li>
          <strong>Opérationnel :</strong> chantiers, clients, devis, factures, photos
          terrain (base légale : exécution du contrat de service).
        </li>
        <li>
          <strong>Techniques :</strong> journaux d'audit (auteur, action, horodatage),
          adresse IP anonymisée (base légale : intérêt légitime, sécurité du Service).
        </li>
      </ul>

      <h2>3. Finalités</h2>
      <ul>
        <li>Fournir le Service et ses fonctionnalités.</li>
        <li>Garantir la sécurité et la traçabilité des opérations.</li>
        <li>Répondre aux obligations légales (facturation, comptabilité, fiscalité).</li>
        <li>Assister l'utilisateur (fonctionnalités d'IA, sur consentement explicite).</li>
      </ul>

      <h2>4. Sous-traitants</h2>
      <ul>
        <li><strong>Hébergeur applicatif :</strong> [Nom, localisation UE].</li>
        <li><strong>Envoi d'emails transactionnels :</strong> [Nom, localisation].</li>
        <li>
          <strong>Intelligence artificielle (optionnelle) :</strong> Anthropic PBC (États-Unis).
          Transfert hors UE encadré par les Clauses Contractuelles Types de la Commission
          européenne (2021/914). Activation soumise au consentement explicite de
          l'utilisateur.
        </li>
      </ul>

      <h2>5. Durées de conservation</h2>
      <ul>
        <li>Compte utilisateur : durée du contrat + 3 ans.</li>
        <li>Factures et comptabilité : 10 ans (Code de commerce L.123-22).</li>
        <li>Bulletins de paie : 5 ans en entreprise (50 ans pour certains archivages légaux).</li>
        <li>Journaux d'audit : 3 ans.</li>
        <li>Cookies : 13 mois maximum.</li>
      </ul>

      <h2>6. Vos droits</h2>
      <p>
        Conformément au RGPD (articles 15 à 22), vous disposez des droits d'accès, de
        rectification, d'effacement, de limitation, de portabilité et d'opposition.
        Ces droits peuvent être exercés directement depuis votre espace utilisateur
        (onglet « Mon compte » → « Données personnelles ») ou par email à l'adresse
        du DPO.
      </p>
      <p>
        En cas de litige non résolu avec l'éditeur, vous pouvez introduire une réclamation
        auprès de la <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">CNIL</a>.
      </p>

      <h2>7. Cookies</h2>
      <p>
        Le Service n'utilise que les cookies strictement nécessaires à son fonctionnement
        (session, préférences d'affichage). Aucun cookie analytique ou publicitaire n'est
        déposé sans consentement explicite.
      </p>
    </article>
  );
}
