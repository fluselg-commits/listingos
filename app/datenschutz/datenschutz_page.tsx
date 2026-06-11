export default function DatenschutzPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16 text-white">
      <h1 className="mb-8 text-4xl font-black">Datenschutzerklärung</h1>

      <div className="space-y-6">
        <section>
          <h2 className="text-2xl font-bold">Verantwortlicher</h2>
          <p>Henryk Piegsa</p>
          <p>E-Mail: support.listingos@gmail.com</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold">Verarbeitete Daten</h2>
          <p>
            Im Rahmen der Nutzung von ListingOS können E-Mail-Adressen,
            hochgeladene Produktbilder und Nutzungsdaten verarbeitet werden.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold">Verwendete Dienste</h2>
          <ul>
            <li>OpenAI (Erstellung von Listing-Inhalten)</li>
            <li>Supabase (Authentifizierung und Datenbank)</li>
            <li>Stripe (Zahlungsabwicklung)</li>
            <li>Vercel (Hosting)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold">Betroffenenrechte</h2>
          <p>
            Nutzer haben das Recht auf Auskunft, Berichtigung, Löschung und
            Einschränkung der Verarbeitung ihrer personenbezogenen Daten.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold">Kontakt</h2>
          <p>support.listingos@gmail.com</p>
        </section>
      </div>
    </main>
  );
}
