import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="container">
      <div className="header" />
      <section className="hero">
        <h1>nPisirsem Yönetim Katmanı</h1>
        <p>
          Bu proje Firebase tabanlı admin panel + public API içerir. Mobil uygulama
          bootstrap/recommendation/suggestion endpointlerinden veri alır.
        </p>
        <p>
          Admin panele geçmek için <Link href="/admin">buraya tıkla</Link>.
        </p>
      </section>
    </main>
  );
}
