import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AboutPage() {
    return (
        <div className="container mx-auto py-10">
            <Card>
                <CardHeader>
                    <CardTitle className="text-3xl font-bold">About VolunteerHub</CardTitle>
                </CardHeader>
                <CardContent className="prose dark:prose-invert">
                    <p className="text-lg">
                        VolunteerHub is a platform dedicated to connecting passionate volunteers with meaningful community events.
                        Our mission is to simplify the process of finding, organizing, and participating in volunteer activities.
                    </p>
                    <h3 className="text-xl font-semibold mt-4">For Volunteers</h3>
                    <p>
                        Easily discover events that match your interests and skills. Track your contributions and connect with other volunteers.
                    </p>
                    <h3 className="text-xl font-semibold mt-4">For Managers</h3>
                    <p>
                        Create and manage events efficiently. Track registrations, communicate with participants, and measure your impact.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
