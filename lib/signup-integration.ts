// Example integration functions for adding users to email automation
// These functions use the client-side safe version

import { addUserToEmailAutomation } from "./email-automation-client";

/**
 * Example: General signup flow integration
 */
export async function handleUserSignup(userData: {
  email: string;
  name?: string;
  userId?: string;
}) {
  try {
    // Your existing signup logic here
    console.log("User signed up:", userData);

    // Add user to email automation
    const result = await addUserToEmailAutomation({
      email: userData.email,
      name: userData.name,
      userId: userData.userId,
      signupDate: new Date(),
    });

    console.log("Email automation result:", result);
    return result;
  } catch (error) {
    console.error("Error in signup flow:", error);
    // Don't fail the signup if email automation fails
    return { success: false, error };
  }
}

/**
 * Example: Firebase Auth integration
 */
export async function handleFirebaseAuthSignup(user: any) {
  try {
    // Your existing Firebase Auth logic here
    console.log("Firebase user signed up:", user);

    // Add user to email automation
    const result = await addUserToEmailAutomation({
      email: user.email,
      name: user.displayName,
      userId: user.uid,
      signupDate: new Date(),
    });

    console.log("Email automation result:", result);
    return result;
  } catch (error) {
    console.error("Error in Firebase Auth signup:", error);
    // Don't fail the signup if email automation fails
    return { success: false, error };
  }
}

/**
 * Example: Custom form integration
 */
export async function handleCustomFormSignup(formData: {
  email: string;
  firstName: string;
  lastName: string;
}) {
  try {
    // Your existing form processing logic here
    console.log("Form data received:", formData);

    // Add user to email automation
    const result = await addUserToEmailAutomation({
      email: formData.email,
      name: `${formData.firstName} ${formData.lastName}`,
      signupDate: new Date(),
    });

    console.log("Email automation result:", result);
    return result;
  } catch (error) {
    console.error("Error in custom form signup:", error);
    // Don't fail the signup if email automation fails
    return { success: false, error };
  }
}

/**
 * Example: API route integration
 */
export async function handleApiRouteSignup(req: any, res: any) {
  try {
    const { email, name, userId } = req.body;

    // Your existing API logic here
    console.log("API signup request:", { email, name, userId });

    // Add user to email automation
    const result = await addUserToEmailAutomation({
      email,
      name,
      userId,
      signupDate: new Date(),
    });

    console.log("Email automation result:", result);

    // Return success response
    res.status(200).json({
      success: true,
      message: "User signed up successfully",
      emailAutomation: result,
    });
  } catch (error) {
    console.error("Error in API route signup:", error);
    
    // Return error response
    res.status(500).json({
      success: false,
      message: "Signup failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
} 