import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { PlayerDetailsPage } from '../pages/PlayerDetailsPage'
import { PlayersPage } from '../pages/PlayersPage'

export const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PlayersPage />} />
        <Route path="/player/:id" element={<PlayerDetailsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
