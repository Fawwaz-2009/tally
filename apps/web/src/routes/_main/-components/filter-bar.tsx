import { Button } from '@/components/ui/button'

interface User {
  id: string
  name: string
}

interface FilterBarProps {
  selectedUserId: string | undefined
  onUserFilterChange: (userId: string | undefined) => void
  users: User[] | undefined
}

export function FilterBar({ selectedUserId, onUserFilterChange, users }: FilterBarProps) {
  const isAllSelected = !selectedUserId

  return (
    <div className="px-4 py-4 flex gap-3 overflow-x-auto no-scrollbar">
      <Button
        variant={isAllSelected ? 'secondary' : 'outline'}
        size="sm"
        onClick={() => onUserFilterChange(undefined)}
        className={`rounded-full h-8 px-4 text-xs font-mono transition-colors shrink-0 ${
          isAllSelected ? 'bg-foreground text-background hover:bg-foreground/90' : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted'
        }`}
      >
        All
      </Button>
      {users?.map((user) => (
        <Button
          key={user.id}
          variant={selectedUserId === user.id ? 'secondary' : 'outline'}
          size="sm"
          onClick={() => onUserFilterChange(user.id)}
          className={`rounded-full h-8 px-4 text-xs font-mono transition-colors shrink-0 ${
            selectedUserId === user.id
              ? 'bg-foreground text-background hover:bg-foreground/90'
              : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          {user.name}
        </Button>
      ))}
    </div>
  )
}
