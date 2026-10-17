import { Link } from 'react-router-dom'
import { useArchive } from '../data'

export function NotFound() {
  const { lang } = useArchive()
  return (
    <div className="empty empty--page">
      <p className="empty-title">{lang === 'ru' ? 'Страница не найдена' : 'Page not found'}</p>
      <Link to="/explore" className="btn">
        {lang === 'ru' ? 'К обзору архива' : 'Go to Explore'}
      </Link>
    </div>
  )
}
