import React from 'react';
import { FooterConfig } from './footer';

export function Footer({ config }: { config: FooterConfig }) {
  return (
    <footer className="mt-16 bg-gray-50 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="font-semibold text-lg mb-4">
              Participating Institutions
            </h3>
            <div className="space-y-4">
              {config.institutions.map((institution) => (
                <a
                  key={institution.name}
                  href={institution.url}
                  className="flex items-center hover:text-blue-600"
                >
                  <img
                    src={institution.logo}
                    alt={institution.name}
                    className="h-8 w-auto mr-2"
                  />
                  <span>{institution.name}</span>
                </a>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-4">Quick Links</h3>
            <ul className="space-y-2">
              {config.quickLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.url}
                    className="hover:text-blue-600"
                    target="_blank"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-4">Connect With Us</h3>
            <div className="space-y-4">
              <div className="flex space-x-4">
                {config.contact.social.twitter && (
                  <a
                    href={config.contact.social.twitter}
                    className="text-gray-600 hover:text-red-600"
                    target="_blank"
                  >
                    <svg
                      className="h-6 w-6"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
                    </svg>
                  </a>
                )}
                {config.contact.social.linkedin && (
                  <a
                    href={config.contact.social.linkedin}
                    className="text-gray-600 hover:text-blue-600"
                    target="_blank"
                  >
                    <svg
                      className="h-6 w-6"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"></path>
                    </svg>
                  </a>
                )}
              </div>
              <div className="mt-4">
                <h4 className="font-medium mb-2">Contact</h4>
                <p className="text-sm text-gray-600">
                  Email:{' '}
                  <a href={`mailto:${config.contact.email}`} target="_blank">
                    {config.contact.email}
                  </a>{' '}
                  <br />
                  {config.contact.phone && <>Phone: {config.contact.phone}</>}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="border-t border-gray-200 mt-12 pt-8 text-center text-sm text-gray-600">
          <p>{config.copyright.text}</p>
          <p className="mt-2">{config.copyright.subtext}</p>
          {/* <p className="mt-2"><a href={``} >GDPR, Terms & Conditions</a></p> */}
        </div>
      </div>
    </footer>
  );
}
