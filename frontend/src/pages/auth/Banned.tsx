import React from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'

export default function BannedPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const reason = searchParams.get('reason') || 'No reason provided.'
  const until = searchParams.get('until')

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-xl w-full bg-white dark:bg-slate-800 rounded-lg shadow p-8 text-center">
        <img src="/src/assets/403.svg" alt="Banned" className="w-32 mx-auto mb-6" />
        <h1 className="text-2xl font-semibold mb-2">You have been banned</h1>
        <p className="text-sm text-muted-foreground mb-4">You cannot access your account at this time.</p>

        <div className="text-left bg-muted p-4 rounded mb-4">
          <p className="text-sm"><strong>Reason:</strong> {reason}</p>
          {until && <p className="text-sm"><strong>Banned until:</strong> {new Date(until).toLocaleString()}</p>}
        </div>

        <div className="flex gap-2 justify-center">
          <button className="btn btn-primary" onClick={() => navigate('/login')}>Go to Login</button>
          <button className="btn" onClick={() => navigate('/')}>Back to Home</button>
        </div>
      </div>
    </div>
  )
}
