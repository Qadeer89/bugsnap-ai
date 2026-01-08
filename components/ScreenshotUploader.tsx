import { useRef, useState } from "react";

type Props = {
  image: string | null;
  setImage: (img: string | null) => void;
};

export default function ScreenshotUploader({ image, setImage }: Props) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);

  function processFile(file: File) {
    if (!file.type.startsWith("image/")) {
      alert("Only image files allowed");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Max file size is 5MB");
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
        accept="image/*"
        onChange={handleFile}
        hidden
      />

      {!image && (
        <p>
          📸 Drag & drop screenshot here<br />
          <span>or click to upload</span>
        </p>
      )}

      {image && (
        <>
          <img src={image} className="preview" />
          <button className="secondary" onClick={(e) => removeImage(e)}>
            Remove Screenshot
          </button>
        </>
      )}
    </div>
  );
}
