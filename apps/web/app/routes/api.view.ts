import { ActionFunctionArgs, json } from "@remix-run/node";

export async function action({ request }: ActionFunctionArgs) {
  const token = request.headers.get("Authorization")?.split(" ")[1];

  if (token === undefined) {
    return json({ success: false }, { status: 401 });
  }

  return json({ succes: true });
}
