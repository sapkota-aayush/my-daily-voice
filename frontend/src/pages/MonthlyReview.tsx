import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const MonthlyReview = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen gradient-warm">
      <header className="px-5 pt-6 pb-4 flex items-center gap-3">
        <button onClick={() => navigate('/')} className="w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary/50 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="font-display text-xl text-foreground">Monthly Review</h1>
        </div>
      </header>

      <div className="px-5 py-12 text-center">
        <p className="text-muted-foreground">Coming soon with voice agents</p>
      </div>
    </div>
  );
};

export default MonthlyReview;
