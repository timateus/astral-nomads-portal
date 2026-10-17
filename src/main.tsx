import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ArchiveProvider, useArchiveCtx } from './data'
import { AuthorPage, Authors } from './pages/Authors'
import { EventPage, Events } from './pages/Events'
import { Explore } from './pages/Explore'
import { Home } from './pages/Home'
import { InstitutionPage, Institutions } from './pages/Institutions'
import { Item } from './pages/Item'
import { NotFound } from './pages/NotFound'
import { People, PersonPage } from './pages/People'
import './styles.css'

function App() {
  const { archive, error } = useArchiveCtx()
  if (error) return <div className="boot">Failed to load archive data: {error}</div>
  if (!archive) return <div className="boot" aria-busy="true"><span className="brand-mark">✶</span></div>
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="explore" element={<Explore />} />
        <Route path="item/:type/:slug" element={<Item />} />
        <Route path="authors" element={<Authors />} />
        <Route path="authors/:slug" element={<AuthorPage />} />
        <Route path="events" element={<Events />} />
        <Route path="events/:slug" element={<EventPage />} />
        <Route path="institutions" element={<Institutions />} />
        <Route path="institutions/:slug" element={<InstitutionPage />} />
        <Route path="people" element={<People />} />
        <Route path="people/:id" element={<PersonPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ArchiveProvider>
        <App />
      </ArchiveProvider>
    </BrowserRouter>
  </StrictMode>,
)
