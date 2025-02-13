// Keep imports unchanged...

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const { data: balanceData } = useQuery<{ balance: number }>({
    queryKey: ["/api/balance"],
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">BluePay</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Bienvenido, {user?.username}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => logoutMutation.mutate()}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Nueva Transacción</CardTitle>
            </CardHeader>
            <CardContent>
              <TransactionForm />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Balance Actual</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={cn(
                "text-4xl font-bold",
                balanceData?.balance === 0
                  ? "text-gray-500"
                  : balanceData?.balance! > 0
                  ? "text-green-600"
                  : "text-red-600"
              )}>
                {new Intl.NumberFormat('es-ES', {
                  style: 'currency',
                  currency: 'EUR',
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                }).format(balanceData?.balance ?? 0)}
              </p>
            </CardContent>
          </Card>
        </div>

        <TransactionList />
      </main>
    </div>
  );
}
