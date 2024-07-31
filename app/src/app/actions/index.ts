"use server";
import prisma from "@/lib/db";

import { EventType, UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";

async function updateUserRole(id: string, role: UserRole) {
    try {
        const updatedUser = await prisma.user.update({
            where: { id },
            data: { role },
        });
        revalidatePath("/admin/users");
        return updatedUser;
    } catch (error) {
        console.error("Error updating user role:", error);
        return null;
    }
}

export async function makeAdmin(id: string) {
    return await updateUserRole(id, UserRole.ADMIN);
}

export async function makeParticipant(id: string) {
    return await updateUserRole(id, UserRole.PARTICIPANT);
}

export async function createEvent(currentState: { message: string; success: boolean }, formData: FormData) {
    try {
        const name = formData.get("name") as string;
        const description = formData.get("description") as string;
        const date = formData.get("date") as string;
        const time = formData.get("time") as string;
        const email = formData.get("email") as string;
        const dateTime = `${date}T${time}:00`;
        const formattedEventDate = new Date(dateTime).toISOString().slice(0, 19).replace("T", " ");
        const location = formData.get("location") as string;
        const eventType = formData.get("eventType") as EventType;
        const DeadlineDate = formData.get("registrationDeadline") as string || date;
        const DeadlineDateTime = `${DeadlineDate}T23:59:00`;
        const minParticipantsPerTeam = Number(formData.get("minParticipantsPerTeam"));
        const maxParticipantsPerTeam = Number(formData.get("maxParticipantsPerTeam"));
        const isTeamEvent = eventType == 'TEAM' ? true : false;

        if (!name || !description || !formattedEventDate) {
            throw new Error("Missing required fields");
        }

        const events = await prisma.event.create({
            data: {
                name,
                description,
                location,
                date: new Date(formattedEventDate),
                coordinatorEmail: email,
                eventType,
                registrationDeadline: new Date(DeadlineDateTime),
                minParticipantsPerTeam,
                maxParticipantsPerTeam,
                isTeamEvent
            },
        });

        await revalidatePath("/admin/events");

        return { message: "Event added successfully", success: true };
    } catch (error) {
        console.error(error)
        return { message: "Failed to create event", success: false };
    }
}

export async function getEventDetails(email: string) {
    const events = await prisma.event.findMany({
        where: {
            coordinatorEmail: email,
        },
    });

    return events;
}

export async function getIndividualEventDetails(id: string): Promise<getIndividualEventDetailsProp | null> {
    // const eventName = name.replace(/-/g, " ");
    const events = await prisma.event.findUnique({
        where: {
            id: id,
        },
        select: {
            id: true,
            name: true,
            location: true,
            date: true,
            coordinatorEmail: true,
            createdAt: true,
            registrations: {
                select: {
                    id: true,
                    createdAt: true
                },
            },
        },
    });
    //get the count of registration

    const count = events?.registrations.length ?? 0;
    const eventWithCount = {
        ...events,
        count,
    };

    return eventWithCount as getIndividualEventDetailsProp;
}

export async function registerForEvent(eventId: string, userId: string) {
    try {
        await prisma.registration.create({
            data: {
                userId,
                eventId,
                attended: false,
            },
        });

        return { message: "Registered successfully", success: true };
    } catch (error: any) {
        return { message: error.message, success: false };
    }
}

export async function getUserDetailsForOneEvent(id: string) {
    // const eventName = decodeURIComponent(name);
    const users = await prisma.event.findMany({
        where: {
            id: id
        },
        include: {
            registrations: {
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            image: true
                        }
                    }
                }
            }
        }

    })
    const registeredUsers = users.flatMap(event =>
        event.registrations.map(registration => registration.user)
    );
    return registeredUsers;

}