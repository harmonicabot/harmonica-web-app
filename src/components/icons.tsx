export function UsersIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export function SettingsIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function SearchIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center">
      <svg
        className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-700"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  );
}

export function Logo() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      className="text-gray-100"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="100%" height="100%" rx="16" fill="currentColor" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M17.6482 10.1305L15.8785 7.02583L7.02979 22.5499H10.5278L17.6482 10.1305ZM19.8798 14.0457L18.11 17.1983L19.394 19.4511H16.8453L15.1056 22.5499H24.7272L19.8798 14.0457Z"
        fill="black"
      />
    </svg>
  );
}

export function MagicWand() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 21 21"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M19.24 0.799913C19.24 0.44645 18.9534 0.159912 18.6 0.159912C18.2465 0.159912 17.96 0.44645 17.96 0.799913V1.75992H17C16.6465 1.75992 16.36 2.04645 16.36 2.39992C16.36 2.75337 16.6465 3.03992 17 3.03992H17.96V3.99992C17.96 4.35337 18.2465 4.63992 18.6 4.63992C18.9534 4.63992 19.24 4.35337 19.24 3.99992V3.03992H20.2C20.5534 3.03992 20.84 2.75337 20.84 2.39992C20.84 2.04645 20.5534 1.75992 20.2 1.75992H19.24V0.799913ZM15.9657 5.03422C16.278 5.34664 16.278 5.85317 15.9657 6.1656L14.3657 7.7656C14.0532 8.07801 13.5467 8.07801 13.2344 7.7656C12.9219 7.45318 12.9219 6.94665 13.2344 6.63422L14.8342 5.03424C15.1467 4.72181 15.6532 4.72181 15.9657 5.03422ZM12.7657 8.23422C13.078 8.54664 13.078 9.05318 12.7657 9.3656L1.56563 20.5656C1.25322 20.878 0.746691 20.878 0.434275 20.5656C0.121843 20.2532 0.121843 19.7467 0.434275 19.4342L11.6343 8.23422C11.9467 7.92181 12.4532 7.92181 12.7657 8.23422ZM18.6 8.15992C18.9534 8.15992 19.24 8.44645 19.24 8.79992V9.75992H20.2C20.5534 9.75992 20.84 10.0464 20.84 10.3999C20.84 10.7534 20.5534 11.0399 20.2 11.0399H19.24V11.9999C19.24 12.3534 18.9534 12.6399 18.6 12.6399C18.2465 12.6399 17.96 12.3534 17.96 11.9999V11.0399H17C16.6465 11.0399 16.36 10.7534 16.36 10.3999C16.36 10.0464 16.6465 9.75992 17 9.75992H17.96V8.79992C17.96 8.44645 18.2465 8.15992 18.6 8.15992ZM11.24 0.799913C11.24 0.44645 10.9534 0.159912 10.6 0.159912C10.2465 0.159912 9.95999 0.44645 9.95999 0.799913V1.75992H8.99999C8.64651 1.75992 8.35999 2.04645 8.35999 2.39992C8.35999 2.75337 8.64651 3.03992 8.99999 3.03992H9.95999V3.99992C9.95999 4.35337 10.2465 4.63992 10.6 4.63992C10.9534 4.63992 11.24 4.35337 11.24 3.99992V3.03992H12.2C12.5534 3.03992 12.84 2.75337 12.84 2.39992C12.84 2.04645 12.5534 1.75992 12.2 1.75992H11.24V0.799913Z"
        fill="black"
      />
    </svg>
  );
}

export function HarmonicaLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      width="147"
      height="13"
      viewBox="0 0 147 13"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4.30466 12.1246H0V0.449875H4.30466V4.57517H10.6801V0.449875H15.0011V12.1246H10.6801V7.47755H4.30466V12.1246Z"
        fill="black"
      />
      <path
        d="M20.6025 12.1246H16.1348L21.9722 0.449875H26.9617L32.636 12.1246H28.1846L27.2878 10.1027H21.483L20.6025 12.1246ZM24.3854 3.07506L22.2983 7.70583H26.4725L24.418 3.07506H24.3854Z"
        fill="black"
      />
      <path
        d="M46.5722 12.4507C44.7786 12.4507 43.8818 11.4072 43.197 10.4288L42.5122 9.30377C42.023 8.60263 41.3219 8.26022 40.5066 8.26022H38.0934V12.1246H33.7887V0.449875H43.6373C46.7679 0.449875 48.5778 1.80323 48.5778 4.15123C48.5778 5.91222 47.3223 7.13514 45.1863 7.54277V7.55908C45.5776 7.68952 45.9363 8.03194 46.2135 8.43958L47.0125 9.64618C47.2408 9.9723 47.5343 10.168 48.0071 10.168C48.2843 10.168 48.6757 10.0375 48.8713 9.80924L49.5562 11.5376C48.9202 12.0757 47.6321 12.4507 46.5722 12.4507ZM38.0934 2.97723V5.86331H42.3165C43.5394 5.86331 44.2569 5.32522 44.2569 4.41212C44.2569 3.51531 43.5394 2.97723 42.3328 2.97723H38.0934Z"
        fill="black"
      />
      <path
        d="M54.7511 12.1246H50.691V0.449875H56.2349L60.295 8.32544H60.3276L64.3225 0.449875H69.9479V12.1246H65.8878V4.83606H65.8552L62.2027 12.1246H58.5666L54.7837 4.85236H54.7511V12.1246Z"
        fill="black"
      />
      <path
        d="M80.1918 12.5323C75.0393 12.5323 71.6151 10.0375 71.6151 6.28725C71.6151 2.52067 75.0393 0.0422363 80.1918 0.0422363C85.3443 0.0422363 88.7685 2.52067 88.7685 6.28725C88.7685 10.0375 85.3443 12.5323 80.1918 12.5323ZM80.1918 9.51574C82.7518 9.51574 84.4475 8.22761 84.4475 6.28725C84.4475 4.34689 82.7518 3.05876 80.1918 3.05876C77.6318 3.05876 75.9197 4.34689 75.9197 6.28725C75.9197 8.22761 77.6318 9.51574 80.1918 9.51574Z"
        fill="black"
      />
      <path
        d="M94.4952 12.1246H90.4351V0.449875H95.6039L101.865 8.03194H101.882V0.449875H105.942V12.1246H100.773L94.5115 4.44473H94.4952V12.1246Z"
        fill="black"
      />
      <path
        d="M112.183 12.1246H107.895V0.449875H112.183V12.1246Z"
        fill="black"
      />
      <path
        d="M122.379 12.4018C117.161 12.4018 113.851 10.1517 113.851 6.28725C113.851 2.53698 116.965 0.156375 121.889 0.156375C125.64 0.156375 128.526 1.78693 129.308 4.3632L125.395 5.16217C124.988 3.95556 123.667 3.1892 122.004 3.1892C119.656 3.1892 118.155 4.3795 118.155 6.28725C118.172 8.17869 119.851 9.3853 122.493 9.3853C124.58 9.3853 126.129 8.47219 126.455 7.021L130.434 7.72214C129.814 10.5919 126.7 12.4018 122.379 12.4018Z"
        fill="black"
      />
      <path
        d="M134.588 12.1246H130.12L135.957 0.449875H140.947L146.621 12.1246H142.17L141.273 10.1027H135.468L134.588 12.1246ZM138.37 3.07506L136.283 7.70583H140.458L138.403 3.07506H138.37Z"
        fill="black"
      />
    </svg>
  );
}

export function Settings() {
  return (
    <svg
      width="17"
      height="16"
      viewBox="0 0 17 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g opacity="0.5">
        <path
          d="M14 4.66675H8"
          stroke="black"
          stroke-width="1.33"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M10 11.3333H4"
          stroke="black"
          stroke-width="1.33"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M12 13.3333C13.1046 13.3333 14 12.4378 14 11.3333C14 10.2287 13.1046 9.33325 12 9.33325C10.8954 9.33325 10 10.2287 10 11.3333C10 12.4378 10.8954 13.3333 12 13.3333Z"
          stroke="black"
          stroke-width="1.25"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M5.33398 6.66675C6.43855 6.66675 7.33398 5.77132 7.33398 4.66675C7.33398 3.56218 6.43855 2.66675 5.33398 2.66675C4.22941 2.66675 3.33398 3.56218 3.33398 4.66675C3.33398 5.77132 4.22941 6.66675 5.33398 6.66675Z"
          stroke="black"
          stroke-width="1.25"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </g>
    </svg>
  );
}

export function Calendar() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g opacity="0.5">
        <path
          d="M14 5.00008V4.00008C14 3.64646 13.8595 3.30732 13.6095 3.05727C13.3594 2.80722 13.0203 2.66675 12.6667 2.66675H3.33333C2.97971 2.66675 2.64057 2.80722 2.39052 3.05727C2.14048 3.30732 2 3.64646 2 4.00008V13.3334C2 13.687 2.14048 14.0262 2.39052 14.2762C2.64057 14.5263 2.97971 14.6667 3.33333 14.6667H5.66667"
          stroke="black"
          stroke-width="1.33"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M10.667 1.33325V3.99992"
          stroke="black"
          stroke-width="1.33"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M5.33301 1.33325V3.99992"
          stroke="black"
          stroke-width="1.25"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M2 6.66675H5.33333"
          stroke="black"
          stroke-width="1.25"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M11.667 11.6666L10.667 10.8333V9.33325"
          stroke="black"
          stroke-width="1.25"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M14.667 10.6667C14.667 11.7276 14.2456 12.745 13.4954 13.4952C12.7453 14.2453 11.7279 14.6667 10.667 14.6667C9.60613 14.6667 8.58871 14.2453 7.83857 13.4952C7.08842 12.745 6.66699 11.7276 6.66699 10.6667C6.66699 9.60588 7.08842 8.58847 7.83857 7.83832C8.58871 7.08818 9.60613 6.66675 10.667 6.66675C11.7279 6.66675 12.7453 7.08818 13.4954 7.83832C14.2456 8.58847 14.667 9.60588 14.667 10.6667Z"
          stroke="black"
          stroke-width="1.25"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </g>
    </svg>
  );
}

export function Eye() {
  return (
    <svg
      width="16"
      height="17"
      viewBox="0 0 16 17"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g opacity="0.5">
        <path
          d="M1.33301 8.91984C1.33301 8.91984 3.33301 4.25317 7.99967 4.25317C12.6663 4.25317 14.6663 8.91984 14.6663 8.91984C14.6663 8.91984 12.6663 13.5865 7.99967 13.5865C3.33301 13.5865 1.33301 8.91984 1.33301 8.91984Z"
          stroke="black"
          stroke-width="1.33"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M8 10.9199C9.10457 10.9199 10 10.0245 10 8.91992C10 7.81535 9.10457 6.91992 8 6.91992C6.89543 6.91992 6 7.81535 6 8.91992C6 10.0245 6.89543 10.9199 8 10.9199Z"
          stroke="black"
          stroke-width="1.33"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </g>
    </svg>
  );
}

export function Send() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g clip-path="url(#clip0_521_1956)">
        <path
          d="M14.6663 1.33325L7.33301 8.66659"
          stroke="#FAFAF9"
          stroke-width="0.833333"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M14.6663 1.33325L9.99967 14.6666L7.33301 8.66659L1.33301 5.99992L14.6663 1.33325Z"
          stroke="#FAFAF9"
          stroke-width="0.833333"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </g>
      <defs>
        <clipPath id="clip0_521_1956">
          <rect width="16" height="16" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}

export function Share() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g opacity="0.5">
        <path
          d="M12 5.33325C13.1046 5.33325 14 4.43782 14 3.33325C14 2.22868 13.1046 1.33325 12 1.33325C10.8954 1.33325 10 2.22868 10 3.33325C10 4.43782 10.8954 5.33325 12 5.33325Z"
          stroke="black"
          stroke-width="1.33"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M4 10C5.10457 10 6 9.10457 6 8C6 6.89543 5.10457 6 4 6C2.89543 6 2 6.89543 2 8C2 9.10457 2.89543 10 4 10Z"
          stroke="black"
          stroke-width="1.33"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M12 14.6667C13.1046 14.6667 14 13.7713 14 12.6667C14 11.5622 13.1046 10.6667 12 10.6667C10.8954 10.6667 10 11.5622 10 12.6667C10 13.7713 10.8954 14.6667 12 14.6667Z"
          stroke="black"
          stroke-width="1.25"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M5.72656 9.00659L10.2799 11.6599"
          stroke="black"
          stroke-width="1.25"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M10.2732 4.34009L5.72656 6.99342"
          stroke="black"
          stroke-width="1.25"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </g>
    </svg>
  );
}

export function User() {
  return (
    <svg
      width="17"
      height="16"
      viewBox="0 0 17 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g opacity="0.5">
        <path
          d="M12.9993 14V12.6667C12.9993 11.9594 12.7184 11.2811 12.2183 10.781C11.7182 10.281 11.0399 10 10.3327 10H6.33268C5.62544 10 4.94716 10.281 4.44706 10.781C3.94697 11.2811 3.66602 11.9594 3.66602 12.6667V14"
          stroke="black"
          stroke-width="1.33"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M8.33268 7.33333C9.80544 7.33333 10.9993 6.13943 10.9993 4.66667C10.9993 3.19391 9.80544 2 8.33268 2C6.85992 2 5.66602 3.19391 5.66602 4.66667C5.66602 6.13943 6.85992 7.33333 8.33268 7.33333Z"
          stroke="black"
          stroke-width="1.33"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </g>
    </svg>
  );
}
