export const sidebarLinks = [
    {
      imgURL: "/icons/home.svg",
      route: "/",
      label: "Home",
    },
    {
      imgURL: "/icons/headphone.svg",
      route: "/text-editor",
      label: "Documents",
    },
    {
      imgURL: "/icons/profile.svg",
      route: "/code-editor",
      label: "Projects",
    },
];


export const FileOperations = [
  {
    imgURL: "/icons/home.svg",
    route: "/",
    label: "Home",
  },
  {
    imgURL: "/icons/headphone.svg",
    route: "/text-editor",
    label: "All Text Files",
  },
  {
    imgURL: "/icons/profile.svg",
    route: "/code-editor",
    label: "All Code Files",
  },
];

export const TEXT_EDITOR_TOOLBAR_OPTIONS = [
  [{ header: [1, 2, 3, 4, 5, 6, false] }],
  [{ font: [] }],
  [{ size: ['small', false, 'large', 'huge'] }],
  [{ list: 'ordered' }, { list: 'bullet' }],
  [{ indent: '-1' }, { indent: '+1' }],
  [{ direction: 'rtl' }],
  ['bold', 'italic', 'underline', 'strike'],
  [{ color: [] }, { background: [] }],
  [{ script: 'sub' }, { script: 'super' }],
  [{ align: [] }],
  ['link', 'image', 'video'],
  ['blockquote', 'code-block'],
  ['clean'],
];
