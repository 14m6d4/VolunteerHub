import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ShieldX } from 'lucide-react';

export default function ForbiddenPage() {
    const navigate = useNavigate();

    return (
        <div className="container mx-auto py-10 px-4 max-w-2xl">
            <Card className="text-center py-12">
                <CardContent className="space-y-6">
                    <div className="flex justify-center">
                        <div className="p-4 rounded-full bg-red-100 dark:bg-red-900/30">
                            <ShieldX className="h-16 w-16 text-red-600 dark:text-red-400" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h1 className="text-4xl font-bold">403</h1>
                        <h2 className="text-2xl font-semibold">Access Forbidden</h2>
                        <p className="text-muted-foreground">
                            You don't have permission to access this resource.
                        </p>
                    </div>

                    <div className="flex justify-center gap-3">
                        <Button onClick={() => navigate(-1)} variant="outline">
                            Go Back
                        </Button>
                        <Button onClick={() => navigate('/')}>
                            Go Home
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
