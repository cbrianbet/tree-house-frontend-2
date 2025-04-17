// api/auth/[...nextauth]/route.ts
import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import axios from "axios";
import { JwtUtils, UrlUtils } from "@/constants/Utils";

namespace NextAuthUtils {
    export const refreshToken = async (refreshToken: string) => {
        try {
            const response = await axios.post(
                UrlUtils.makeUrl(
                    process.env.BACKEND_API_BASE!,
                    "auth",
                    "token",
                    "refresh"
                ),
                { refresh: refreshToken }
            );

            const { access, refresh } = response.data;
            return [access, refresh];
        } catch {
            return [null, null];
        }
    };
}

const authOptions: NextAuthOptions = {
    secret: process.env.SESSION_SECRET!,
    session: {
        strategy: "jwt",
        maxAge: 24 * 60 * 60, // 24 hours
    },
    jwt: {
        secret: process.env.JWT_SECRET!,
    },
    debug: process.env.NODE_ENV === "development",
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
    ],
    callbacks: {
        async jwt({ token, user, account }) {
            if (user && account?.provider === "google") {
                const { access_token: accessToken, id_token: idToken } = account;

                try {
                    const response = await axios.post(
                        UrlUtils.makeUrl(
                            process.env.BACKEND_API_BASE!,
                            "social",
                            "login",
                            account.provider
                        ),
                        { access_token: accessToken, id_token: idToken }
                    );

                    const { access_token, refresh_token } = response.data;
                    return {
                        ...token,
                        accessToken: access_token,
                        refreshToken: refresh_token,
                    };
                } catch (error) {
                    return token;
                }
            }
            console.log(`my token returned ${JSON.stringify(token)}`)

            if (JwtUtils.isJwtExpired(token as string)) {
                const [newAccessToken, newRefreshToken] = await NextAuthUtils.refreshToken(
                    token.refreshToken as string
                );

                if (newAccessToken && newRefreshToken) {
                    return {
                        ...token,
                        accessToken: newAccessToken,
                        refreshToken: newRefreshToken,
                        iat: Math.floor(Date.now() / 1000),
                        exp: Math.floor(Date.now() / 1000 + 2 * 60 * 60),
                    };
                }

                return { ...token, exp: 0 };
            }

            return token;
        },
        async session({ session, token }) {
            session.accessToken = token.accessToken;
            return session;
        },
    },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
