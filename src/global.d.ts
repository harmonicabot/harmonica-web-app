interface Window {
  showOpenFilePicker(options): Promise<FileSystemFileHandle[]>;
}