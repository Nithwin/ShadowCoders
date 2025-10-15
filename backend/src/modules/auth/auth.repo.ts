import { Prisma , User} from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

interface GoogleProfile {
    email: string;
    name?: string | null;
    pictureUrl?: string | null;
    googleId: string;
}

export const findUserByEmailAndLinkGoogle = async ({email, name, pictureUrl, googleId}: GoogleProfile) => {
    try{
        const dataToUpdate :Prisma.UserUpdateInput = {
            googleId:googleId,
        }
        if(name !== undefined){
            dataToUpdate.name = name;
        }
        if(pictureUrl !== undefined){
            dataToUpdate.pictureUrl = pictureUrl;
        }
        const user = await prisma.user.update({
            where:{
                email:email,
            },
            data:dataToUpdate,
        })
        return user;
        
    } catch(error){
        if(error instanceof PrismaClientKnownRequestError && error.code === 'P2025'){
            return null;
        }
        throw error;
    }
}


export const findUserByEmail = (email: string): Promise<User | null> => {
    return prisma.user.findUnique({
        where:{
            email
        },
    })
}

export const findUserById = (id: string) => {
    return prisma.user.findUnique({
        where:{id},
        select:{
            id:true,
            email:true,
            name:true,
            role:true,
            pictureUrl:true,
            createdAt:true,
        }
    })
}