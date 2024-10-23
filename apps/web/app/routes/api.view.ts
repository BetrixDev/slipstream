import { ActionFunctionArgs, json } from "@vercel/remix";
import axios from "axios";
import { env } from "env/web";

export async function action({ request }: ActionFunctionArgs) {
  const token = request.headers.get("Authorization");

  if (token === undefined) {
    return json({ success: false }, { status: 401 });
  }

  const response = await axios(`${env.VIEWS_API_URL}/incrementViews`, {
    method: "POST",
    headers: {
      Authorization: token,
    },
    validateStatus: () => true,
  });

  return json(response.data, { status: response.status });
}
