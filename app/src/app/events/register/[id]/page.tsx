import prisma from "@/lib/db";
import RegisterPage from "@/components/events/RegisterPage";

export default async function Register({ params }: { params: any }) {
  const eventId = params.id;

  try {
    const event = await prisma.event.findUnique({
      where: {
        id: eventId,
      },
    });

    if (!event) {
      return <div>Event not found</div>;
    }

    return <RegisterPage event={event} />;
  } catch (error) {
    console.error("Error retrieving event details:", error);
    return <div>Error retrieving event details</div>;
  }
}