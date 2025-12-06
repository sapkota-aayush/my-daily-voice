import { Task } from '@/hooks/useJournalData';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Check, X } from 'lucide-react';

interface TaskListProps {
  tasks: Task[];
  onStatusChange?: (taskId: string, status: Task['status']) => void;
  readonly?: boolean;
}

export function TaskList({ tasks, onStatusChange, readonly = false }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-6 text-sm">
        No tasks yet. Record your morning plan to get started.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {tasks.map((task) => (
        <li 
          key={task.id}
          className={cn(
            "flex items-center gap-3 p-3 rounded-lg transition-all duration-200",
            task.status === 'completed' && "bg-success/10",
            task.status === 'missed' && "bg-destructive/10",
            task.status === 'pending' && "bg-secondary/50"
          )}
        >
          {!readonly ? (
            <Checkbox
              checked={task.status === 'completed'}
              onCheckedChange={(checked) => {
                onStatusChange?.(task.id, checked ? 'completed' : 'pending');
              }}
              className="h-5 w-5"
            />
          ) : (
            <div className={cn(
              "w-5 h-5 rounded-full flex items-center justify-center",
              task.status === 'completed' && "bg-success",
              task.status === 'missed' && "bg-destructive",
              task.status === 'pending' && "bg-muted"
            )}>
              {task.status === 'completed' && <Check className="w-3 h-3 text-success-foreground" />}
              {task.status === 'missed' && <X className="w-3 h-3 text-destructive-foreground" />}
            </div>
          )}
          <span className={cn(
            "flex-1 text-sm",
            task.status === 'completed' && "line-through text-muted-foreground",
            task.status === 'missed' && "text-muted-foreground"
          )}>
            {task.name}
          </span>
        </li>
      ))}
    </ul>
  );
}
