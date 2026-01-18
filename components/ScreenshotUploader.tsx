import { useRef, useState } from "react";

type Mode = "image" | "gif" | "scenario";

type Props = {
  image: string | null;
  setImage: (img: string | null) => void;
  mode: Mode;
};

export default function ScreenshotUploader({ image, setImage, mode }: Props) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);

  function processFile(file: File) {
    const isImage = file.type.startsWith("image/");
    const isGif = file.type === "image/gif";

    if (!isImage) {
      alert("Only image or GIF files are allowed");
      return;
    }

    // Size limits
    if (isGif && file.size > 10 * 1024 * 1024) {
      alert("Max GIF size is 10MB");
      return;
    }

    if (!isGif && file.size > 5 * 1024 * 1024) {
      alert("Max image size is 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }

  function removeImage(e: React.MouseEvent) {
    e.stopPropagation();
    setImage(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  // 🧠 Scenario mode → hide uploader completely
  if (mode === "scenario") {
    return (
      <div className="dropzone disabled">
        <p>📝 Scenario mode selected — no screenshot required</p>
      </div>
    );
  }

  return (
    <div
      className={`dropzone ${dragOver ? "drag-over" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => fileRef.current?.click()}
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/*,.gif"
        onChange={handleFile}
        hidden
      />

      {!image && (
        <p>
          {mode === "gif" ? "🎞️ Upload GIF recording" : "📸 Upload screenshot"}
          <br />
          <span>or drag & drop</span>
        </p>
      )}

      {image && (
        <>
          <img src={image} className="preview" />
          <button className="secondary" onClick={removeImage}>
            Remove
          </button>
        </>
      )}
    </div>
  );
}
