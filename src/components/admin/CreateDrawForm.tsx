"use client";

import { useFormState } from "react-dom";

type Props = {
  createDraw: (
    prevState: string,
    formData: FormData
  ) => Promise<string>;
};

export default function CreateDrawForm({ createDraw }: Props) {
  const [error, formAction] = useFormState(createDraw, "");

  return (
    <form
      action={formAction}
      className="w-80 space-y-4 border-t border-ink-100 p-5"
    >
      <div>
        <label
          htmlFor="draw_month"
          className="block text-sm font-medium"
        >
          Draw month
        </label>

        <input
          id="draw_month"
          name="draw_month"
          type="month"
          defaultValue={new Date().toISOString().slice(0, 7)}
          className="mt-1 w-full rounded-xl border border-ink-200 px-3 py-2"
          required
        />
      </div>

      <div>
        <label
          htmlFor="draw_type"
          className="block text-sm font-medium"
        >
          Draw type
        </label>

        <select
          id="draw_type"
          name="draw_type"
          defaultValue="random"
          className="mt-1 w-full rounded-xl border border-ink-200 px-3 py-2"
        >
          <option value="random">Random</option>
          <option value="algorithmic">Algorithmic</option>
        </select>
      </div>

      <button
        type="submit"
        className="w-full rounded-xl bg-[#17194f] px-4 py-2.5 font-semibold text-white hover:bg-[#25286b]"
      >
        Create Draw
      </button>

      {error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
          {error}
        </p>
      )}
    </form>
  );
}